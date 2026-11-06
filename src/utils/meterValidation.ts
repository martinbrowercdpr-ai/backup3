import { Vehicle, VehicleType } from '../types';
import { RAW_TK_REVISIONS } from '../data/tkRevisionsHistory';
import { TRUCK_TO_TK_MAPPING, TK_TO_TRUCK_MAPPING, TK_REAL_HOURS } from '../data/initialData';

export interface MeterValidationOptions {
  allowZeroForCarreta?: boolean;
  isBatchSync?: boolean;
  readingDate?: string;
  allowRollback?: boolean;
  isMaintenanceRegistration?: boolean;
}

export interface MeterValidationResult {
  isValid: boolean;
  sanitizedValue: number;
  error?: string;
  warning?: string;
  isDecimalTruncationFixed?: boolean;
  diff?: number;
  anomalyType?:
    | 'negative'
    | 'decimal_truncated'
    | 'excessive_period'
    | 'excessive_absolute'
    | 'unauthorized_rollback'
    | 'below_tk_preventiva'
    | 'invalid_format';
}

// Limites físicos e operacionais absolutos (teto máximo)
export const MAX_ABSOLUTE_METER: Record<VehicleType, number> = {
  cavalo: 2500000, // 2.500.000 KM (máximo operacional de caminhões pesados)
  carreta: 1500000, // 1.500.000 KM
  tk: 60000,       // 60.000 Horas (mais de 7 anos funcionando 24h ininterruptas)
};

// Limites máximos de incremento aceitáveis por período (para barrar digitações com dígitos a mais)
export const MAX_PERIODIC_INCREMENT: Record<VehicleType, { dailySync: number; manualUpdate: number }> = {
  cavalo: {
    dailySync: 3500,     // 3.500 KM (24h ininterruptas a ~90km/h = ~2.160km; margem segura 3.500km)
    manualUpdate: 25000, // 25.000 KM em atualização manual entre semanas
  },
  carreta: {
    dailySync: 3500,     // 3.500 KM
    manualUpdate: 35000, // 35.000 KM (ciclo completo de 30k)
  },
  tk: {
    dailySync: 750,      // 750 Horas (acomoda rodagens diárias, semanais e mensais acumuladas)
    manualUpdate: 5000,  // 5.000 Horas em manutenção e ajuste operacional
  },
};

/**
 * Localiza o horímetro da última preventiva executada no Thermo King (TK).
 * Usado para blindar o sistema contra atualizações com horímetros menores que a última preventiva.
 */
export function getTkLastPreventivaMeter(
  plate?: string,
  vehicle?: { lastMaintenanceMeter?: number; plate?: string; type?: string; coupledTkPlate?: string; coupledCarretaPlate?: string }
): number {
  const clean = (s?: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();
  const rawPlate = plate || vehicle?.plate || '';
  const cleanP = clean(rawPlate);
  if (!cleanP) return 0;

  // 1. Se o veículo já possui lastMaintenanceMeter válido (>= 500h)
  let best = 0;
  if (vehicle && vehicle.type === 'tk' && typeof vehicle.lastMaintenanceMeter === 'number' && vehicle.lastMaintenanceMeter >= 500) {
    best = vehicle.lastMaintenanceMeter;
  }

  // 2. Mapeamento de aliases e placas vinculadas
  const candidatePlates = new Set<string>();
  candidatePlates.add(cleanP);
  if (rawPlate) candidatePlates.add(rawPlate);

  const tkAlias = TRUCK_TO_TK_MAPPING[rawPlate];
  if (tkAlias) {
    candidatePlates.add(tkAlias);
    candidatePlates.add(clean(tkAlias));
  }
  const truckAlias = TK_TO_TRUCK_MAPPING[rawPlate];
  if (truckAlias) {
    candidatePlates.add(truckAlias);
    candidatePlates.add(clean(truckAlias));
  }
  if (vehicle?.coupledTkPlate) {
    candidatePlates.add(vehicle.coupledTkPlate);
    candidatePlates.add(clean(vehicle.coupledTkPlate));
  }
  if (vehicle?.coupledCarretaPlate) {
    candidatePlates.add(vehicle.coupledCarretaPlate);
    candidatePlates.add(clean(vehicle.coupledCarretaPlate));
  }

  // 3. Procura no histórico oficial de preventivas realizadas (VideFrigo / Munique)
  for (const r of RAW_TK_REVISIONS) {
    if (r.executed === 'SIM' && r.type === 'PREVENTIVA' && r.meter > 0) {
      const rClean = clean(r.plate);
      if (candidatePlates.has(r.plate) || candidatePlates.has(rClean)) {
        if (r.meter > best) {
          best = r.meter;
        }
      }
    }
  }

  // 4. Se ainda for 0, verifica se existe valor de referência em TK_REAL_HOURS
  if (best === 0 && TK_REAL_HOURS[rawPlate]) {
    best = Math.max(best, TK_REAL_HOURS[rawPlate]);
  }

  return best;
}

/**
 * Converte qualquer entrada (string brasileira, texto de planilha ou número float)
 * em um número inteiro seguro, detectando e corrigindo ou bloqueando formatos decimais truncados.
 * Exemplo crucial: "805.419" deve se tornar 805419 e NUNCA ser lido como 805.
 */
export function parseRawMeter(raw: string | number | undefined | null, vehicleType?: VehicleType, currentVehicleMeter?: number): {
  numericValue: number;
  fixedDecimal: boolean;
  detectedFormatError?: string;
} {
  if (raw === undefined || raw === null || raw === '') {
    return { numericValue: NaN, fixedDecimal: false };
  }

  // 1. Se for número direto
  if (typeof raw === 'number') {
    if (isNaN(raw)) return { numericValue: NaN, fixedDecimal: false };

    // Caso de número decimal onde o Excel ou runtime converteu "805.419" para 805.419 float:
    // Se o veículo atual tem quilometragem de centenas de milhares (ex: > 10.000) e o float é < 2.000
    const rawStr = raw.toString();
    const hasDecimals = rawStr.includes('.');
    const decimalDigits = hasDecimals ? rawStr.split('.')[1] || '' : '';

    if (hasDecimals && decimalDigits.length > 0) {
      // Se tiver exatamente 3 casas decimais (ex: 805.419 ou 40.900)
      if (decimalDigits.length === 3 && raw > 0 && raw < 2000) {
        return {
          numericValue: Math.round(raw * 1000),
          fixedDecimal: true,
        };
      }

      // Se tiver 1 ou 2 casas decimais (ex: 805.4 ou 805.42):
      // Para um cavalo ou carreta com odômetro alto, isso indica abreviação decimal perigosa
      if (currentVehicleMeter && currentVehicleMeter > 10000 && raw < 2000) {
        const multiplied = Math.round(raw * 1000);
        // Se multiplicado se aproxima do odômetro atual
        if (multiplied >= currentVehicleMeter - 5000 && multiplied <= currentVehicleMeter + 10000) {
          return {
            numericValue: multiplied,
            fixedDecimal: true,
          };
        }
        return {
          numericValue: NaN,
          fixedDecimal: false,
          detectedFormatError: `Formato decimal incorreto detectado: o valor "${raw}" seria lido como ${Math.round(raw)} para um veículo de ${currentVehicleMeter.toLocaleString('pt-BR')}. Digite o valor inteiro completo.`,
        };
      }
    }

    return { numericValue: Math.round(raw), fixedDecimal: false };
  }

  // 2. Se for string
  const str = String(raw).trim();
  if (!str) return { numericValue: NaN, fixedDecimal: false };

  // Remove caracteres que não sejam dígitos, pontos, vírgulas ou sinal negativo
  const cleaned = str.replace(/[^\d.,-]/g, '');
  if (!cleaned) return { numericValue: NaN, fixedDecimal: false };

  // Se for negativo
  if (cleaned.startsWith('-')) {
    return { numericValue: -1, fixedDecimal: false };
  }

  // Padrão Milhar Brasileiro: ex: "805.419" ou "40.900" ou "1.243.300"
  // Grupos de 3 dígitos separados por ponto
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    const intVal = parseInt(cleaned.replace(/\./g, ''), 10);
    return { numericValue: intVal, fixedDecimal: false };
  }

  // Padrão Milhar com vírgula: ex: "805,419"
  if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
    const intVal = parseInt(cleaned.replace(/,/g, ''), 10);
    return { numericValue: intVal, fixedDecimal: false };
  }

  // Padrão com ponto e vírgula: ex: "805.419,00" ou "805.419,5"
  if (cleaned.includes('.') && cleaned.includes(',')) {
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    if (lastComma > lastDot) {
      // Padrão brasileiro: ponto é milhar, vírgula é decimal
      const noDots = cleaned.replace(/\./g, '');
      const parts = noDots.split(',');
      const intPart = parseInt(parts[0], 10);
      return { numericValue: isNaN(intPart) ? NaN : intPart, fixedDecimal: false };
    } else {
      // Padrão americano: vírgula é milhar, ponto é decimal
      const noCommas = cleaned.replace(/,/g, '');
      const parts = noCommas.split('.');
      const intPart = parseInt(parts[0], 10);
      return { numericValue: isNaN(intPart) ? NaN : intPart, fixedDecimal: false };
    }
  }

  // Padrão com apenas ponto (ex: "805.419" ou "805.4" ou "805.42")
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length === 2) {
      const integerPart = parts[0];
      const decPart = parts[1];

      // Se tiver 3 dígitos após o ponto (ex: 805.419) -> é milhar brasileiro!
      if (decPart.length === 3) {
        return {
          numericValue: parseInt(integerPart + decPart, 10),
          fixedDecimal: true,
        };
      }

      // Se tiver 1 ou 2 dígitos (ex: 805.4 ou 805.42)
      // Se o veículo atual tem mais de 10.000 KM e o inteiro é menor que 2.000:
      // Ex: 805.4 para um caminhão de 803.449 KM -> NUNCA deixar virar 805!
      if (currentVehicleMeter && currentVehicleMeter > 10000 && parseInt(integerPart, 10) < 2000) {
        // Tenta inferir se foi digitação de milhares abreviada (805.4 -> 805400)
        const paddedDec = decPart.padEnd(3, '0').slice(0, 3);
        const inferred = parseInt(integerPart + paddedDec, 10);
        if (Math.abs(inferred - currentVehicleMeter) < 15000) {
          return {
            numericValue: inferred,
            fixedDecimal: true,
          };
        }
        return {
          numericValue: NaN,
          fixedDecimal: false,
          detectedFormatError: `Formato decimal incorreto: "${str}" seria lido como ${integerPart} KM para um veículo de ${currentVehicleMeter.toLocaleString('pt-BR')} KM. Informe o número completo sem pontos abreviados.`,
        };
      }

      // Se o inteiro for maior que 2000, provavelmente o ponto foi decimal real (ex: 12500.5)
      const parsedFloat = parseFloat(cleaned);
      return { numericValue: isNaN(parsedFloat) ? NaN : Math.round(parsedFloat), fixedDecimal: false };
    } else if (parts.length > 2) {
      // Múltiplos pontos (ex: 1.243.300) -> remove todos os pontos
      const intVal = parseInt(cleaned.replace(/\./g, ''), 10);
      return { numericValue: isNaN(intVal) ? NaN : intVal, fixedDecimal: false };
    }
  }

  // Padrão com apenas vírgula (ex: "805,419" ou "805,4")
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts.length === 2) {
      const integerPart = parts[0];
      const decPart = parts[1];

      if (decPart.length === 3) {
        return {
          numericValue: parseInt(integerPart + decPart, 10),
          fixedDecimal: true,
        };
      }

      if (currentVehicleMeter && currentVehicleMeter > 10000 && parseInt(integerPart, 10) < 2000) {
        const paddedDec = decPart.padEnd(3, '0').slice(0, 3);
        const inferred = parseInt(integerPart + paddedDec, 10);
        if (Math.abs(inferred - currentVehicleMeter) < 15000) {
          return {
            numericValue: inferred,
            fixedDecimal: true,
          };
        }
        return {
          numericValue: NaN,
          fixedDecimal: false,
          detectedFormatError: `Formato decimal incorreto: "${str}" seria lido como ${integerPart} KM para um veículo de ${currentVehicleMeter.toLocaleString('pt-BR')} KM. Informe o número completo.`,
        };
      }

      const parsedFloat = parseFloat(cleaned.replace(',', '.'));
      return { numericValue: isNaN(parsedFloat) ? NaN : Math.round(parsedFloat), fixedDecimal: false };
    }
  }

  // Apenas dígitos
  const pureDigits = cleaned.replace(/\D/g, '');
  const parsedInt = parseInt(pureDigits, 10);
  return { numericValue: isNaN(parsedInt) ? NaN : parsedInt, fixedDecimal: false };
}

/**
 * Validação rigorosa central de KM / Horas para qualquer veículo da frota
 */
export function validateAndSanitizeMeter(
  rawInput: string | number | undefined | null,
  vehicle: Vehicle | { type: VehicleType; currentMeter: number; meterUnit?: 'KM' | 'HORAS'; plate?: string; lastMaintenanceMeter?: number; coupledTkPlate?: string; coupledCarretaPlate?: string },
  options: MeterValidationOptions = {}
): MeterValidationResult {
  const vehicleType: VehicleType = vehicle.type;
  const currentMeter = vehicle.currentMeter || 0;
  const unit = vehicle.meterUnit || (vehicleType === 'tk' ? 'HORAS' : 'KM');

  // 1. Parser inteligente com proteção contra truncamento decimal
  const { numericValue, fixedDecimal, detectedFormatError } = parseRawMeter(rawInput, vehicleType, currentMeter);

  if (detectedFormatError) {
    return {
      isValid: false,
      sanitizedValue: 0,
      error: detectedFormatError,
      anomalyType: 'decimal_truncated',
    };
  }

  if (isNaN(numericValue)) {
    return {
      isValid: false,
      sanitizedValue: 0,
      error: `Informe um valor numérico válido de ${unit}.`,
      anomalyType: 'invalid_format',
    };
  }

  // 2. Bloqueio estrito de valores negativos
  if (numericValue < 0) {
    return {
      isValid: false,
      sanitizedValue: 0,
      error: `Valores negativos não são permitidos. A medição deve ser maior ou igual a zero (${numericValue} ${unit} informado).`,
      anomalyType: 'negative',
    };
  }

  // 3. Teto máximo físico operacional
  const maxLimit = MAX_ABSOLUTE_METER[vehicleType] || 2500000;
  if (numericValue > maxLimit) {
    return {
      isValid: false,
      sanitizedValue: numericValue,
      error: `O valor informado (${numericValue.toLocaleString('pt-BR')} ${unit}) excede o limite operacional máximo aceito para ${vehicleType.toUpperCase()} (${maxLimit.toLocaleString('pt-BR')} ${unit}).`,
      anomalyType: 'excessive_absolute',
    };
  }

  // 3.5 Bloqueio Mandatário TK: Horímetro NUNCA pode ser inferior à última preventiva realizada
  // "SEMPRE QUE SICRONIZAR NÃO DEIXE ATT SE FOR MENOS QUE O ULTIMO HORIMETRO DA ULTIMA PREVENTIVA TK."
  const lastPreventivaMeter = vehicleType === 'tk' ? getTkLastPreventivaMeter(vehicle.plate, vehicle as any) : 0;
  if (
    vehicleType === 'tk' &&
    !options.isMaintenanceRegistration &&
    lastPreventivaMeter > 0 &&
    numericValue < lastPreventivaMeter
  ) {
    return {
      isValid: false,
      sanitizedValue: numericValue,
      diff: numericValue - currentMeter,
      error: `Bloqueio de Horímetro TK: O valor informado (${numericValue.toLocaleString('pt-BR')} HORAS) é inferior ao horímetro da última preventiva realizada (${lastPreventivaMeter.toLocaleString('pt-BR')} HORAS). Não é permitido sincronizar medição abaixo da última preventiva do Thermo King.`,
      anomalyType: 'below_tk_preventiva',
    };
  }

  // 4. Bloqueio de redução drástica ou truncamento mascarado (ex: veículo com 803.449 KM e valor digitado virou 805)
  if (!options.allowRollback && !options.isMaintenanceRegistration && currentMeter > 10000 && numericValue > 0 && numericValue < 2000) {
    // Exceção: Carreta zerando para novo ciclo de 30k/50k é permitida se explicitamente 0
    if (vehicleType === 'carreta' && numericValue === 0) {
      // permitido
    } else {
      return {
        isValid: false,
        sanitizedValue: numericValue,
        error: `Bloqueio de segurança: O valor informado (${numericValue.toLocaleString('pt-BR')} ${unit}) causaria uma redução incompatível de ${Math.round(currentMeter - numericValue).toLocaleString('pt-BR')} ${unit} em relação ao valor atual (${currentMeter.toLocaleString('pt-BR')} ${unit}). Verifique se não houve formato decimal incorreto (ex: 805.419 virando 805).`,
        anomalyType: 'decimal_truncated',
      };
    }
  }

  // 5. Verificação de incremento lógico por período (dispensado em registros de manutenção)
  const diff = numericValue - currentMeter;
  const periodicLimits = MAX_PERIODIC_INCREMENT[vehicleType] || { dailySync: 3500, manualUpdate: 25000 };
  const maxAllowedDiff = options.isBatchSync ? periodicLimits.dailySync : periodicLimits.manualUpdate;

  // Reconhece correção/alinhamento legítimo de placa TK com horímetro inicial anômalo baixo (ex: 50h, 100h, 500h) para seu valor real de painel
  const isAnomalousLowBase =
    currentMeter < 1500 || (lastPreventivaMeter > 5000 && currentMeter < lastPreventivaMeter * 0.5);

  const isTkCorrectionFromLowBase =
    vehicleType === 'tk' &&
    isAnomalousLowBase &&
    numericValue >= (lastPreventivaMeter > 0 ? lastPreventivaMeter : 1000) &&
    numericValue <= maxLimit;

  // Se houver salto muito grande fora de manutenção e não for correção de base baixa
  if (!options.isMaintenanceRegistration && !isTkCorrectionFromLowBase && diff > maxAllowedDiff) {
    return {
      isValid: false,
      sanitizedValue: numericValue,
      diff,
      error: `Incremento de +${diff.toLocaleString('pt-BR')} ${unit} excede o limite lógico operacional permitido por período (${maxAllowedDiff.toLocaleString('pt-BR')} ${unit}). Verifique se não foi adicionado um zero ou dígito a mais.`,
      anomalyType: 'excessive_period',
    };
  }

  // 6. Verificação de medição inferior / retrocesso
  if (diff < 0) {
    // Registro de revisão / manutenção executada (pode ser retroativa ou do passado, ex: 60 dias atrás)
    if (options.isMaintenanceRegistration || options.allowRollback) {
      return {
        isValid: true,
        sanitizedValue: numericValue,
        diff,
        warning: `Medição de revisão informada: ${numericValue.toLocaleString('pt-BR')} ${unit}.`,
      };
    }

    // Carreta zerando após preventiva é normal
    if (vehicleType === 'carreta' && numericValue === 0 && options.allowZeroForCarreta) {
      return {
        isValid: true,
        sanitizedValue: 0,
        diff,
        warning: 'Novo ciclo de preventiva iniciado (odômetro zerado para 0 KM).',
      };
    }

    // Se a redução for expressiva (> 50 KM ou > 10 Horas) em odômetro diário
    const tolerance = vehicleType === 'tk' ? 5 : 50;
    if (Math.abs(diff) > tolerance) {
      return {
        isValid: false,
        sanitizedValue: numericValue,
        diff,
        error: `A nova medição (${numericValue.toLocaleString('pt-BR')} ${unit}) é inferior à medição registrada atualmente (${currentMeter.toLocaleString('pt-BR')} ${unit}).`,
        anomalyType: 'unauthorized_rollback',
      };
    }
  }

  return {
    isValid: true,
    sanitizedValue: numericValue,
    diff,
    isDecimalTruncationFixed: fixedDecimal,
  };
}
