import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Vehicle, MaintenanceRecord, ChangeLogEntry, AbastecimentoSyncEntry } from '../types';
import { parseRawMeter, MAX_ABSOLUTE_METER } from '../utils/meterValidation';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  timestamp: string;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    timestamp: new Date().toISOString(),
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
}

// Sanitiza objetos para o Firestore (remove propriedades undefined que o Firestore não aceita)
function sanitizeForFirestore<T>(data: T): Record<string, any> {
  const clean: Record<string, any> = {};
  if (!data || typeof data !== 'object') return clean;

  Object.entries(data as Record<string, any>).forEach(([key, value]) => {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        clean[key] = sanitizeForFirestore(value);
      } else {
        clean[key] = value;
      }
    }
  });

  return clean;
}

const COLLECTION_VEHICLES = 'vehicles';
const COLLECTION_HISTORY = 'maintenanceRecords';
const COLLECTION_CHANGELOGS = 'changeLogs';
const COLLECTION_ABASTECIMENTO_SYNC = 'abastecimentoSyncLogs';

/**
 * Escuta em tempo real todas as alterações na frota de veículos com auto-reconexão
 * Atualiza automaticamente quando qualquer usuário altera qualquer valor
 */
export function subscribeToVehicles(
  onUpdate: (vehicles: Vehicle[]) => void,
  onError?: (err: Error) => void
): () => void {
  let isCancelled = false;
  let activeUnsubscribe: (() => void) | null = null;

  function connect() {
    if (isCancelled) return;
    const colRef = collection(db, COLLECTION_VEHICLES);
    activeUnsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: Vehicle[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as Vehicle;
          if (!item.id) item.id = d.id;
          list.push(item);
        });
        onUpdate(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, COLLECTION_VEHICLES);
        onError?.(err);
        // Tenta reconectar automaticamente em 5s se a conexão cair
        if (!isCancelled) {
          setTimeout(connect, 5000);
        }
      }
    );
  }

  connect();

  return () => {
    isCancelled = true;
    if (activeUnsubscribe) activeUnsubscribe();
  };
}

/**
 * Escuta em tempo real o histórico completo de manutenções com auto-reconexão
 */
export function subscribeToHistory(
  onUpdate: (history: MaintenanceRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  let isCancelled = false;
  let activeUnsubscribe: (() => void) | null = null;

  function connect() {
    if (isCancelled) return;
    const colRef = collection(db, COLLECTION_HISTORY);
    activeUnsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: MaintenanceRecord[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as MaintenanceRecord;
          if (!item.id) item.id = d.id;
          list.push(item);
        });
        // Ordena por data mais recente
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        onUpdate(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, COLLECTION_HISTORY);
        onError?.(err);
        if (!isCancelled) {
          setTimeout(connect, 5000);
        }
      }
    );
  }

  connect();

  return () => {
    isCancelled = true;
    if (activeUnsubscribe) activeUnsubscribe();
  };
}

/**
 * Escuta em tempo real os logs de alterações e auditoria com auto-reconexão
 */
export function subscribeToChangeLogs(
  onUpdate: (logs: ChangeLogEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  let isCancelled = false;
  let activeUnsubscribe: (() => void) | null = null;

  function connect() {
    if (isCancelled) return;
    const colRef = collection(db, COLLECTION_CHANGELOGS);
    activeUnsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: ChangeLogEntry[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as ChangeLogEntry;
          if (!item.id) item.id = d.id;
          list.push(item);
        });
        list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        onUpdate(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, COLLECTION_CHANGELOGS);
        onError?.(err);
        if (!isCancelled) {
          setTimeout(connect, 5000);
        }
      }
    );
  }

  connect();

  return () => {
    isCancelled = true;
    if (activeUnsubscribe) activeUnsubscribe();
  };
}

/**
 * Busca todos os dados da nuvem sob demanda (Refresh forçado)
 */
export async function fetchAllCloudData(): Promise<{
  vehicles: Vehicle[];
  history: MaintenanceRecord[];
  changeLogs: ChangeLogEntry[];
} | null> {
  try {
    const [vSnap, hSnap, lSnap] = await Promise.all([
      getDocs(collection(db, COLLECTION_VEHICLES)),
      getDocs(collection(db, COLLECTION_HISTORY)),
      getDocs(collection(db, COLLECTION_CHANGELOGS)),
    ]);

    const vehicles: Vehicle[] = [];
    vSnap.forEach((d) => {
      const item = d.data() as Vehicle;
      if (!item.id) item.id = d.id;
      vehicles.push(item);
    });

    const history: MaintenanceRecord[] = [];
    hSnap.forEach((d) => {
      const item = d.data() as MaintenanceRecord;
      if (!item.id) item.id = d.id;
      history.push(item);
    });
    history.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const changeLogs: ChangeLogEntry[] = [];
    lSnap.forEach((d) => {
      const item = d.data() as ChangeLogEntry;
      if (!item.id) item.id = d.id;
      changeLogs.push(item);
    });
    changeLogs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    return { vehicles, history, changeLogs };
  } catch (e) {
    console.error('Erro ao buscar dados na nuvem:', e);
    return null;
  }
}

/**
 * Sanitiza rigorosamente odômetros/horímetros antes de gravar no Firestore,
 * impedindo valores negativos, truncamentos decimais (ex: 805.419 -> 805) e excedentes lógicos.
 */
function sanitizeVehicleMeter(v: Vehicle): Vehicle {
  let meter = v.currentMeter;
  if (typeof meter !== 'number' || isNaN(meter) || meter < 0) {
    meter = 0;
  }

  // Se o número estiver em formato decimal truncado (ex: 805.419 lido como float)
  const rawParsed = parseRawMeter(meter, v.type);
  if (!isNaN(rawParsed.numericValue) && rawParsed.numericValue >= 0) {
    meter = rawParsed.numericValue;
  }

  // Teto máximo físico operacional
  const max = MAX_ABSOLUTE_METER[v.type] || 2500000;
  if (meter > max) {
    console.warn(`[Firestore Guard] Veículo ${v.plate} com medição ${meter} acima do teto (${max}). Ajustado para o teto.`);
    meter = max;
  }

  return {
    ...v,
    currentMeter: Math.round(meter),
    kmSinceLastMaintenance: v.kmSinceLastMaintenance !== undefined ? Math.max(0, Math.round(v.kmSinceLastMaintenance)) : undefined,
  };
}

/**
 * Salva ou atualiza um veículo no Firestore (sincronização instantânea para todos os usuários)
 */
export async function saveVehicleToCloud(vehicle: Vehicle): Promise<void> {
  const sanitizedVehicle = sanitizeVehicleMeter(vehicle);
  const docId = (sanitizedVehicle.id || sanitizedVehicle.plate || `veh-${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
  const path = `${COLLECTION_VEHICLES}/${docId}`;
  try {
    const docRef = doc(db, COLLECTION_VEHICLES, docId);
    await setDoc(docRef, sanitizeForFirestore({ ...sanitizedVehicle, id: docId }), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Salva múltiplos veículos no Firestore em lote (batch)
 */
export async function saveMultipleVehiclesToCloud(vehicles: Vehicle[]): Promise<void> {
  if (!vehicles || vehicles.length === 0) return;

  const CHUNK_SIZE = 400;
  for (let i = 0; i < vehicles.length; i += CHUNK_SIZE) {
    const chunk = vehicles.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((v) => {
      const sanitizedVehicle = sanitizeVehicleMeter(v);
      const docId = (sanitizedVehicle.id || sanitizedVehicle.plate || `veh-${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
      const docRef = doc(db, COLLECTION_VEHICLES, docId);
      batch.set(docRef, sanitizeForFirestore({ ...sanitizedVehicle, id: docId }), { merge: true });
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTION_VEHICLES);
      throw error;
    }
  }
}

/**
 * Salva um novo registro de manutenção no Firestore e atualiza o veículo simultaneamente
 */
export async function saveMaintenanceRecordToCloud(
  record: MaintenanceRecord,
  updatedVehicle?: Partial<Vehicle> & { id?: string; plate?: string }
): Promise<void> {
  const batch = writeBatch(db);

  // 1. Grava registro de histórico
  const recordDocId = (record.id || `maint-${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
  const recordRef = doc(db, COLLECTION_HISTORY, recordDocId);
  batch.set(recordRef, sanitizeForFirestore({ ...record, id: recordDocId }), { merge: true });

  // 2. Se fornecido veículo atualizado, grava no mesmo batch para consistência atômica
  if (updatedVehicle) {
    const vId = (updatedVehicle.id || updatedVehicle.plate || record.vehicleId || record.plate).replace(/[^a-zA-Z0-9_\-]/g, '_');
    if (vId) {
      const vehicleRef = doc(db, COLLECTION_VEHICLES, vId);
      batch.set(vehicleRef, sanitizeForFirestore({ ...updatedVehicle, id: vId }), { merge: true });
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_HISTORY}/${recordDocId}`);
    throw error;
  }
}

/**
 * Salva múltiplos registros de histórico no Firestore em lote (ex: importações e restaurações oficiais)
 */
export async function saveMultipleHistoryRecordsToCloud(records: MaintenanceRecord[]): Promise<void> {
  if (!records || records.length === 0) return;

  const CHUNK_SIZE = 400;
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((r, idx) => {
      const recordDocId = (r.id || `rec-${i + idx}-${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
      const docRef = doc(db, COLLECTION_HISTORY, recordDocId);
      batch.set(docRef, sanitizeForFirestore({ ...r, id: recordDocId }), { merge: true });
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTION_HISTORY);
      throw error;
    }
  }
}

/**
 * Exclui um veículo do Firestore
 */
export async function deleteVehicleFromCloud(vehicleId: string): Promise<void> {
  const path = `${COLLECTION_VEHICLES}/${vehicleId}`;
  try {
    await deleteDoc(doc(db, COLLECTION_VEHICLES, vehicleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Exclui um registro do histórico no Firestore
 */
export async function deleteHistoryRecordFromCloud(recordId: string): Promise<void> {
  const path = `${COLLECTION_HISTORY}/${recordId}`;
  try {
    await deleteDoc(doc(db, COLLECTION_HISTORY, recordId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Limpa todos os históricos de um tipo específico no Firestore (ex: cavalo, carreta ou tk)
 */
export async function clearHistoryByTypeFromCloud(vehicleType: 'cavalo' | 'carreta' | 'tk'): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_HISTORY));
    const toDelete: string[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as MaintenanceRecord;
      if (data.vehicleType === vehicleType) {
        toDelete.push(d.id);
      }
    });

    const CHUNK_SIZE = 400;
    for (let i = 0; i < toDelete.length; i += CHUNK_SIZE) {
      const chunk = toDelete.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((id) => batch.delete(doc(db, COLLECTION_HISTORY, id)));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTION_HISTORY);
    throw error;
  }
}

/**
 * Salva um log de alteração no Firestore
 */
export async function saveChangeLogToCloud(logEntry: ChangeLogEntry): Promise<void> {
  const docId = (logEntry.id || `log-${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
  const path = `${COLLECTION_CHANGELOGS}/${docId}`;
  try {
    const docRef = doc(db, COLLECTION_CHANGELOGS, docId);
    await setDoc(docRef, sanitizeForFirestore({ ...logEntry, id: docId }), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    // Logs não devem travar a aplicação se falharem
  }
}

/**
 * Salva múltiplos logs de auditoria no Firestore em lote
 */
export async function saveMultipleChangeLogsToCloud(logs: ChangeLogEntry[]): Promise<void> {
  if (!logs || logs.length === 0) return;

  const CHUNK_SIZE = 400;
  for (let i = 0; i < logs.length; i += CHUNK_SIZE) {
    const chunk = logs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((l, idx) => {
      const docId = (l.id || `log-${i + idx}-${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
      const docRef = doc(db, COLLECTION_CHANGELOGS, docId);
      batch.set(docRef, sanitizeForFirestore({ ...l, id: docId }), { merge: true });
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTION_CHANGELOGS);
    }
  }
}

/**
 * Inicializa a nuvem caso a coleção esteja vazia na primeira execução
 */
export async function seedCloudIfEmpty(
  seedVehicles: Vehicle[],
  seedHistory: MaintenanceRecord[],
  seedLogs: ChangeLogEntry[]
): Promise<boolean> {
  try {
    const vehiclesSnap = await getDocs(collection(db, COLLECTION_VEHICLES));
    if (vehiclesSnap.empty) {
      console.log('Nuvem Firestore vazia. Populando dados iniciais da frota Martin Brower...');
      await saveMultipleVehiclesToCloud(seedVehicles);

      const historySnap = await getDocs(collection(db, COLLECTION_HISTORY));
      if (historySnap.empty && seedHistory.length > 0) {
        await saveMultipleHistoryRecordsToCloud(seedHistory);
      }

      const logsSnap = await getDocs(collection(db, COLLECTION_CHANGELOGS));
      if (logsSnap.empty && seedLogs.length > 0) {
        await saveMultipleChangeLogsToCloud(seedLogs);
      }

      return true;
    }
    return false;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'seedCheck');
    return false;
  }
}

/**
 * Escuta em tempo real os logs de sincronização recebidos do App de Abastecimento
 */
export function subscribeToAbastecimentoSyncLogs(
  onUpdate: (logs: AbastecimentoSyncEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  let isCancelled = false;
  let activeUnsubscribe: (() => void) | null = null;

  function connect() {
    if (isCancelled) return;
    const colRef = collection(db, COLLECTION_ABASTECIMENTO_SYNC);
    activeUnsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: AbastecimentoSyncEntry[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as AbastecimentoSyncEntry;
          if (!item.id) item.id = d.id;
          list.push(item);
        });
        // Ordena decrescente por timestamp
        list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        onUpdate(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, COLLECTION_ABASTECIMENTO_SYNC);
        onError?.(err);
        if (!isCancelled) {
          setTimeout(connect, 5000);
        }
      }
    );
  }

  connect();

  return () => {
    isCancelled = true;
    if (activeUnsubscribe) activeUnsubscribe();
  };
}

/**
 * Salva um log de sincronização de abastecimento no Firestore
 */
export async function saveAbastecimentoSyncLog(entry: AbastecimentoSyncEntry): Promise<void> {
  const docId = (entry.id || `sync-${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
  const path = `${COLLECTION_ABASTECIMENTO_SYNC}/${docId}`;
  try {
    const docRef = doc(db, COLLECTION_ABASTECIMENTO_SYNC, docId);
    await setDoc(docRef, sanitizeForFirestore({ ...entry, id: docId }), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
