import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
} from 'firebase/firestore';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega configurações do Firebase
const firebaseConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
}

const TARGET_DB_ID =
  firebaseConfig.firestoreDatabaseId ||
  'ai-studio-remixremixgestod-18dc0af9-af92-49f9-a5b6-17122868abc3';
const SOURCE_ABASTECIMENTO_DB_ID =
  'ai-studio-controledeabaste-5ed3930c-7d3f-4f51-88e3-bce581c0c010';

// Inicializa o Firebase Client no servidor
const appFirebase = initializeApp(firebaseConfig);
const db = initializeFirestore(
  appFirebase,
  {
    ignoreUndefinedProperties: true,
  },
  TARGET_DB_ID
);

const app = express();
const PORT = 3000;

// Middleware para JSON com limite generoso
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS irrestrito para aceitar requisições de outros apps e origens (ex: App de Abastecimento)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key'
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Normalização rigorosa de placa (remove hífens, espaços, pontos e padroniza para maiúsculas)
function normalizePlate(plate: string): string {
  let p = (plate || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  // Substituições de frotas oficiais solicitadas pelo usuário
  if (p === 'EKH9428') p = 'TCK6F83';
  if (p === 'EKH9424') p = 'TCK6F97';
  if (p === 'FSG7745') p = 'EGY1481';
  return p;
}

// Converte e higieniza qualquer entrada de hodômetro (evita erros decimais como 245.926 ser lido como 245)
function parseIncomingMeter(rawVal: any): number {
  if (rawVal === undefined || rawVal === null) return 0;

  if (typeof rawVal === 'number') {
    // Se veio um float tipo 245.926 (onde .926 são dígitos de milhar truncados por conversão errônea)
    if (!Number.isInteger(rawVal)) {
      const parts = rawVal.toString().split('.');
      if (parts[1] && parts[1].length === 3) {
        return Math.round(rawVal * 1000);
      }
    }
    return Math.max(0, Math.round(rawVal));
  }

  const str = String(rawVal).trim();
  // Se contiver ponto de milhar comum no Brasil: "245.926" -> 245926
  if (/^\d{1,4}\.\d{3}$/.test(str)) {
    return parseInt(str.replace(/\./g, ''), 10);
  }
  // Se contiver vírgula decimal ou separador
  if (/^\d+,\d+$/.test(str)) {
    return Math.round(parseFloat(str.replace(',', '.')));
  }

  // Remove qualquer caractere não numérico
  const digitsOnly = str.replace(/[^\d]/g, '');
  const parsed = parseInt(digitsOnly, 10);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

// Endpoint de Informações da API e Status da Integração
app.get(['/api/status', '/api/sync-meter/info', '/api/abastecimento/info'], (req: Request, res: Response) => {
  res.json({
    status: 'online',
    appName: 'Gestão de Manutenção de Frotas Martin Brower CD PR',
    targetDatabaseId: TARGET_DB_ID,
    sourceDatabaseId: SOURCE_ABASTECIMENTO_DB_ID,
    webhookEndpoint: '/api/sync-meter',
    method: 'POST',
    description: 'Recebe placa e hodômetro do App de Abastecimento e grava instantaneamente no banco de manutenção',
    expectedPayload: {
      placa: 'DUE-4590',
      hodometro: 245926,
      posto: 'Interno CD PR (opcional)',
      frentista: 'Nome do Frentista (opcional)',
      litros: 280,
    },
    sampleCurl: `curl -X POST "https://${req.get('host')}/api/sync-meter" -H "Content-Type: application/json" -d '{"placa":"DUE-4590","hodometro":245926}'`,
  });
});

// Processamento da atualização de hodômetro
async function processSingleSyncItem(item: any) {
  const rawPlate = String(
    item.placa || item.plate || item.placaVeiculo || item.veiculo || ''
  ).trim();

  if (!rawPlate) {
    throw new Error('Campo de placa não fornecido');
  }

  const cleanInputPlate = normalizePlate(rawPlate);
  const rawMeter =
    item.hodometro ??
    item.odometro ??
    item.meter ??
    item.km ??
    item.currentMeter ??
    item.horimetro ??
    item.horas;

  const newMeter = parseIncomingMeter(rawMeter);

  // Busca todos os veículos no Firestore para localizar o veículo correspondente
  const vehiclesSnap = await getDocs(collection(db, 'vehicles'));
  let matchedVehicleDocId: string | null = null;
  let matchedVehicleData: any = null;

  vehiclesSnap.forEach((d) => {
    const v = d.data();
    const cleanVehPlate = normalizePlate(v.plate || d.id);
    if (cleanVehPlate === cleanInputPlate) {
      matchedVehicleDocId = d.id;
      matchedVehicleData = v;
    }
  });

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const isoTimestamp = now.toISOString();

  if (!matchedVehicleDocId || !matchedVehicleData) {
    // Registra log de aviso para auditoria
    const syncLogId = `sync-warn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    await setDoc(doc(db, 'abastecimentoSyncLogs', syncLogId), {
      id: syncLogId,
      plate: rawPlate,
      cleanPlate: cleanInputPlate,
      vehicleType: 'cavalo',
      previousMeter: 0,
      newMeter,
      diffMeter: 0,
      unit: 'KM',
      timestamp: isoTimestamp,
      dateStr,
      timeStr,
      sourceDatabaseId: SOURCE_ABASTECIMENTO_DB_ID,
      targetDatabaseId: TARGET_DB_ID,
      status: 'warning',
      frentista: item.frentista || 'Frentista',
      posto: item.posto || '',
      litros: item.litros ? Number(item.litros) : undefined,
      combustivel: item.combustivel || '',
      message: `Placa ${rawPlate} não encontrada na frota cadastrada`,
    });

    return {
      success: false,
      notFound: true,
      plate: rawPlate,
      cleanPlate: cleanInputPlate,
      message: `Veículo com placa ${rawPlate} não foi encontrado na frota ativa.`,
    };
  }

  const previousMeter = matchedVehicleData.currentMeter || 0;
  const diffMeter = newMeter - previousMeter;

  // Atualiza o documento do veículo na base de Manutenção (TARGET_DB_ID)
  const updatedVehicle = {
    ...matchedVehicleData,
    currentMeter: newMeter,
    updatedAt: isoTimestamp,
    lastMeterSyncSource: 'App de Abastecimento',
  };

  await setDoc(doc(db, 'vehicles', matchedVehicleDocId), updatedVehicle, { merge: true });

  // Cria log de alteração na coleção changeLogs (visível no histórico de alterações)
  const changeLogId = `log-abast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  await setDoc(doc(db, 'changeLogs', changeLogId), {
    id: changeLogId,
    timestamp: isoTimestamp,
    dateStr,
    timeStr,
    type: 'meter_update',
    vehicleId: matchedVehicleDocId,
    plate: matchedVehicleData.plate,
    vehicleType: matchedVehicleData.type || 'cavalo',
    performedBy: item.frentista ? `Frentista: ${item.frentista}` : 'App Abastecimento',
    action: 'Atualização Automática via Abastecimento',
    previousValue: previousMeter,
    newValue: newMeter,
    difference: diffMeter,
    unit: matchedVehicleData.meterUnit || 'KM',
    notes: `Origem: App Abastecimento. Posto: ${item.posto || 'Interno CD PR'}. Litros: ${item.litros || 'N/I'}`,
  });

  // Cria log específico de sincronização em abastecimentoSyncLogs
  const syncLogId = `sync-ok-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  await setDoc(doc(db, 'abastecimentoSyncLogs', syncLogId), {
    id: syncLogId,
    plate: matchedVehicleData.plate,
    cleanPlate: cleanInputPlate,
    vehicleType: matchedVehicleData.type || 'cavalo',
    previousMeter,
    newMeter,
    diffMeter,
    unit: matchedVehicleData.meterUnit || 'KM',
    timestamp: isoTimestamp,
    dateStr,
    timeStr,
    sourceDatabaseId: SOURCE_ABASTECIMENTO_DB_ID,
    targetDatabaseId: TARGET_DB_ID,
    status: 'success',
    frentista: item.frentista || 'Frentista',
    posto: item.posto || 'Interno CD PR',
    litros: item.litros ? Number(item.litros) : undefined,
    combustivel: item.combustivel || 'Diesel S10',
    message: `Odômetro atualizado de ${previousMeter.toLocaleString('pt-BR')} para ${newMeter.toLocaleString('pt-BR')} ${matchedVehicleData.meterUnit || 'KM'}`,
  });

  return {
    success: true,
    plate: matchedVehicleData.plate,
    cleanPlate: cleanInputPlate,
    vehicleType: matchedVehicleData.type,
    previousMeter,
    newMeter,
    diffMeter,
    unit: matchedVehicleData.meterUnit || 'KM',
    targetDatabaseId: TARGET_DB_ID,
    sourceDatabaseId: SOURCE_ABASTECIMENTO_DB_ID,
    updatedAt: isoTimestamp,
    message: `Odômetro do veículo ${matchedVehicleData.plate} atualizado com sucesso para ${newMeter.toLocaleString('pt-BR')} ${matchedVehicleData.meterUnit || 'KM'}!`,
  };
}

// Endpoint Principal do Webhook de Abastecimento
app.post(
  [
    '/api/sync-meter',
    '/api/odometro',
    '/api/abastecimento/webhook',
    '/api/webhook/abastecimento',
  ],
  async (req: Request, res: Response) => {
    try {
      const payload = req.body;

      if (!payload) {
        return res.status(400).json({
          success: false,
          error: 'Payload vazio. Envie um JSON com { "placa": "...", "hodometro": 000 }',
        });
      }

      // Suporta tanto envio individual quanto array de abastecimentos
      if (Array.isArray(payload)) {
        const results = [];
        for (const item of payload) {
          try {
            const r = await processSingleSyncItem(item);
            results.push(r);
          } catch (itemErr: any) {
            results.push({
              success: false,
              item,
              error: itemErr.message,
            });
          }
        }
        return res.json({
          success: true,
          total: payload.length,
          results,
        });
      }

      // Se veio encapsulado em { data: { ... } }
      const singleItem = payload.data || payload;
      const result = await processSingleSyncItem(singleItem);

      if (result.notFound) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Erro ao processar webhook de abastecimento:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Erro interno ao processar sincronização',
      });
    }
  }
);

// Endpoint para consultar histórico recente de sincronizações
app.get('/api/sync-meter/logs', async (req: Request, res: Response) => {
  try {
    const snap = await getDocs(collection(db, 'abastecimentoSyncLogs'));
    const list: any[] = [];
    snap.forEach((d) => {
      list.push(d.data());
    });
    list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    res.json({
      success: true,
      total: list.length,
      logs: list.slice(0, 50),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Integração com Vite (Dev ou Produção)
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    // Em produção serve arquivos estáticos do build
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Em desenvolvimento monta Vite em modo middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Martin Brower rodando na porta ${PORT}`);
    console.log(`📡 Webhook de Abastecimento disponível em: http://0.0.0.0:${PORT}/api/sync-meter`);
    console.log(`🎯 Database ID de Manutenção: ${TARGET_DB_ID}`);
    console.log(`⛽ Database ID de Abastecimento: ${SOURCE_ABASTECIMENTO_DB_ID}`);
  });
}

startServer();
