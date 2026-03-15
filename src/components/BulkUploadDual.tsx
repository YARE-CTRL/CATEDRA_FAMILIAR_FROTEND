import { useState } from 'react';
import { 
  IconCheck, 
  IconAlertTriangle,
  IconFileSpreadsheet,
  IconLoader,
  IconUsers
} from './ui/Icons';
import Button from './ui/Button';
import apiClient from '../api/apiClient';
import * as XLSX from 'xlsx';

interface BulkUploadDualProps {
  institucionId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

interface UploadResult {
  procesados: number;
  total_exitosos: number;
  total_errores: number;
  tasa_exito_general?: string;
  hojas_procesadas?: {
    acudientes?: string;
    estudiantes?: string;
  };
  acudientes: {
    procesados?: number;
    exitosos: number;
    errores?: number;
  };
  estudiantes: {
    procesados?: number;
    exitosos: number;
    errores?: number;
  };
  errores_detalle?: {
    acudientes: Array<{
      fila: number;
      tipo?: string;
      error: string;
    }>;
    estudiantes: Array<{
      fila: number;
      tipo?: string;
      error: string;
    }>;
  };
}

interface ErrorDetalle {
    fila: number;
    tipo?: string;
    error: string;
}

interface ParsedSheetFile {
  workbook: XLSX.WorkBook;
  sheetName: string;
  sheet: XLSX.WorkSheet;
  headers: string[];
}

const toErrorList = (errors: any): ErrorDetalle[] => Array.isArray(errors) ? errors : [];

const normalizeHeader = (value: unknown) => String(value ?? '')
  .trim()
  .replace(/\s+/g, ' ')
  .toUpperCase();

const REQUIRED_HEADERS = {
  acudientes: ['TIPO DOCUMENTO', 'NUMERO DOCUMENTO', 'NOMBRES', 'APELLIDOS', 'TELEFONO'],
  estudiantes: ['TIPO DOCUMENTO', 'NUMERO DOCUMENTO', 'NOMBRES', 'APELLIDOS', 'CURSO']
} as const;

const getMissingHeaders = (headers: string[], requiredHeaders: readonly string[]) => {
  const normalizedHeaders = headers.map(normalizeHeader);
  return requiredHeaders.filter(header => !normalizedHeaders.includes(normalizeHeader(header)));
};

const getApiErrorMessage = (response: any) => {
  return response?.data?.frontend_notifications?.error?.message
    || response?.data?.data?.frontend_notifications?.error?.message
    || response?.data?.error
    || response?.message
    || response?.data?.message
    || response?.error
    || 'Error al procesar la carga masiva';
};

const getBulkUploadPayload = (response: any) => {
  const rawData = response?.data;

  if (rawData && typeof rawData === 'object') {
    if (rawData.data && typeof rawData.data === 'object') {
      return rawData.data;
    }

    return rawData;
  }

  return null;
};

const hasBulkUploadData = (payload: any) => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const hasTopLevelStats = payload.procesados !== undefined
    || payload.total_exitosos !== undefined
    || payload.total_errores !== undefined
    || payload.tasa_exito_general !== undefined;

  const hasNestedStats = payload?.acudientes !== undefined || payload?.estudiantes !== undefined;
  const hasProcessedSheets = payload?.hojas_procesadas !== undefined;

  return hasTopLevelStats || hasNestedStats || hasProcessedSheets;
};

const isSuccessfulBulkUploadResponse = (response: any) => {
  const payload = getBulkUploadPayload(response);
  const rawSuccess = response?.success ?? response?.data?.success;

  if (rawSuccess === true && hasBulkUploadData(payload)) {
    return true;
  }

  if (rawSuccess === true && payload) {
    return true;
  }

  return hasBulkUploadData(payload);
};

const countErroresDetalle = (erroresDetalle?: UploadResult['errores_detalle']) => {
  const acudientes = Array.isArray(erroresDetalle?.acudientes) ? erroresDetalle!.acudientes.length : 0;
  const estudiantes = Array.isArray(erroresDetalle?.estudiantes) ? erroresDetalle!.estudiantes.length : 0;
  return acudientes + estudiantes;
};

const mergeErroresDetalle = (erroresDetalle?: UploadResult['errores_detalle']) => {
  const acudientes = toErrorList(erroresDetalle?.acudientes).map(err => ({ ...err, grupo: 'Acudiente' }));
  const estudiantes = toErrorList(erroresDetalle?.estudiantes).map(err => ({ ...err, grupo: 'Estudiante' }));
  return [...acudientes, ...estudiantes];
}

export default function BulkUploadDual({ institucionId, onClose, onSuccess }: BulkUploadDualProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [archivoEstudiantes, setArchivoEstudiantes] = useState<File | null>(null);
  const [archivoAcudientes, setArchivoAcudientes] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // PASO 1: Instrucciones
  // ============================================

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2 && archivoEstudiantes && archivoAcudientes) {
      handleUpload();
    }
  };

  // ============================================
  // PASO 2: Subir archivos
  // ============================================

  const handleFileEstudiantes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivoEstudiantes(file);
      setError(null);
    }
  };

  const handleFileAcudientes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivoAcudientes(file);
      setError(null);
    }
  };

  const handleDropEstudiantes = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setArchivoEstudiantes(file);
      setError(null);
    }
  };

  const handleDropAcudientes = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setArchivoAcudientes(file);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const fileToArrayBuffer = async (file: File) => {
    return await file.arrayBuffer();
  };

  const parseSheetFile = async (file: File): Promise<ParsedSheetFile> => {
    const buffer = await fileToArrayBuffer(file);
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error(`El archivo ${file.name} no contiene hojas válidas`);
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1, defval: '' });
    const headers = Array.isArray(rows[0]) ? rows[0].map(normalizeHeader).filter(Boolean) : [];

    return { workbook, sheetName, sheet, headers };
  };

  const buildCombinedWorkbook = async (acudientesFile: File, estudiantesFile: File) => {
    const acudientesParsed = await parseSheetFile(acudientesFile);
    const estudiantesParsed = await parseSheetFile(estudiantesFile);
    const missingAcudientesHeaders = getMissingHeaders(acudientesParsed.headers, REQUIRED_HEADERS.acudientes);
    const missingEstudiantesHeaders = getMissingHeaders(estudiantesParsed.headers, REQUIRED_HEADERS.estudiantes);

    if (missingAcudientesHeaders.length > 0) {
      throw new Error(`El archivo de acudientes no contiene las columnas requeridas: ${missingAcudientesHeaders.join(', ')}`);
    }

    if (missingEstudiantesHeaders.length > 0) {
      throw new Error(`El archivo de estudiantes no contiene las columnas requeridas: ${missingEstudiantesHeaders.join(', ')}`);
    }

    const combinedWorkbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(combinedWorkbook, acudientesParsed.sheet, 'Acudientes');
    XLSX.utils.book_append_sheet(combinedWorkbook, estudiantesParsed.sheet, 'Estudiantes');

    const workbookArray = XLSX.write(combinedWorkbook, { bookType: 'xlsx', type: 'array' });
    return new File([workbookArray], 'carga_masiva_completa.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  };

  // ============================================
  // PASO 3: Procesar
  // ============================================

  const handleUpload = async () => {
    if (!archivoEstudiantes || !archivoAcudientes) {
      setError('Debes seleccionar ambos archivos');
      return;
    }

    console.log('🚀 [BulkUploadDual] Iniciando carga masiva...');
    console.log('📄 Archivo Estudiantes:', archivoEstudiantes.name, archivoEstudiantes.size, 'bytes');
    console.log('📄 Archivo Acudientes:', archivoAcudientes.name, archivoAcudientes.size, 'bytes');
    console.log('🏫 Institución ID:', institucionId);

    // Proteger la sesión actual antes de la carga masiva
    const sessionBeforeUpload = localStorage.getItem('session');
    console.log('🔒 [BulkUploadDual] Sesión protegida antes de carga');

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);
    setStep(3);

    try {
      setProgress(20);
      console.log('📡 Combinando archivos para enviar al backend...');
      const combinedFile = await buildCombinedWorkbook(archivoAcudientes, archivoEstudiantes);
      setProgress(45);
      console.log('📡 Enviando archivo combinado al backend...');
      
      const response = await apiClient.cargaMasivaDual(combinedFile);
      const payload = getBulkUploadPayload(response);

      console.log('📥 Respuesta del backend:', response);
      console.log('📊 Datos completos:', JSON.stringify(response.data, null, 2));
      console.log('📦 Payload normalizado:', payload);
      setProgress(100);

      if (isSuccessfulBulkUploadResponse(response) && payload) {
        console.log('✅ Carga exitosa:', payload);
        console.log('📋 Errores del backend:', payload.errores_detalle);
        setError(null);
        setResult({
          procesados: Number(payload.procesados ?? 0),
          total_exitosos: Number(payload.total_exitosos ?? 0),
          total_errores: Number(payload.total_errores ?? 0),
          tasa_exito_general: String(payload.tasa_exito_general ?? '0%'),
          hojas_procesadas: {
            acudientes: payload?.hojas_procesadas?.acudientes,
            estudiantes: payload?.hojas_procesadas?.estudiantes
          },
          acudientes: {
            procesados: Number(payload?.acudientes?.procesados ?? 0),
            exitosos: Number(payload?.acudientes?.exitosos ?? 0),
            errores: Number(payload?.acudientes?.errores ?? 0)
          },
          estudiantes: {
            procesados: Number(payload?.estudiantes?.procesados ?? 0),
            exitosos: Number(payload?.estudiantes?.exitosos ?? 0),
            errores: Number(payload?.estudiantes?.errores ?? 0)
          },
          errores_detalle: {
            acudientes: toErrorList(payload?.errores_detalle?.acudientes),
            estudiantes: toErrorList(payload?.errores_detalle?.estudiantes)
          }
        });
        if (onSuccess) {
          onSuccess();
        }
      } else {
        console.error('❌ Error en la respuesta:', response);
        setError(getApiErrorMessage(response));
      }
    } catch (err: any) {
      console.error('💥 Error capturado:', err);
      console.error('Stack:', err.stack);
      setError(err.message || 'Error inesperado al procesar los archivos');
    } finally {
      setProcessing(false);
      
      // Restaurar la sesión si fue modificada durante la carga
      const sessionAfterUpload = localStorage.getItem('session');
      if (sessionBeforeUpload && sessionAfterUpload !== sessionBeforeUpload) {
        const beforeParsed = JSON.parse(sessionBeforeUpload);
        const afterParsed = JSON.parse(sessionAfterUpload);
        
        if (beforeParsed.user.rol !== afterParsed.user.rol) {
          console.warn('⚠️ [BulkUploadDual] Sesión modificada durante carga. Restaurando...');
          localStorage.setItem('session', sessionBeforeUpload);
          window.location.reload();
        }
      }
      
      console.log('🏁 Proceso finalizado');
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {[
          { num: 1, label: 'Instrucciones' },
          { num: 2, label: 'Cargar Archivos' },
          { num: 3, label: 'Resultado' }
        ].map((s, i) => (
          <div key={s.num} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step >= s.num 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-200 text-slate-400'
              }`}>
                {s.num}
              </div>
              <div className={`text-xs mt-1 ${step >= s.num ? 'text-indigo-600 font-semibold' : 'text-slate-500'}`}>
                {s.label}
              </div>
            </div>
            {i < 2 && (
              <div className={`h-0.5 flex-1 ${step > s.num ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Instrucciones */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100">
            <h3 className="text-lg font-bold text-indigo-900 mb-4">
              📋 Carga Masiva Simplificada
            </h3>
            <p className="text-slate-700 mb-4">
              Puedes subir los archivos <strong>por separado</strong>: uno de acudientes y otro de estudiantes. El sistema los unirá automáticamente antes de enviarlos.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h4 className="font-bold text-slate-800 mb-3">✅ Formato de Archivos Aceptados</h4>
            
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <IconUsers className="text-blue-600 flex-shrink-0 mt-1" size={24} />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900 mb-2">Dos archivos separados</p>
                    <p className="text-sm text-blue-700 mb-2">Debes cargar:</p>
                    <ul className="text-xs text-blue-600 space-y-1">
                      <li>• Un Excel o CSV de `Acudientes`</li>
                      <li>• Un Excel o CSV de `Estudiantes`</li>
                      <li>• El frontend los convertirá en un solo Excel con dos hojas para el backend</li>
                      <li>• Se validan columnas obligatorias antes de enviar</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-700">
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Hoja de Acudientes</h4>
                <p className="font-semibold mb-2">Obligatorias:</p>
                <p className="mb-3">TIPO DOCUMENTO, NUMERO DOCUMENTO, NOMBRES, APELLIDOS, TELEFONO</p>
                <p className="font-semibold mb-2">Opcionales:</p>
                <p>CORREO, DIRECCION, PARENTESCO, OCUPACION</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Hoja de Estudiantes</h4>
                <p className="font-semibold mb-2">Obligatorias:</p>
                <p className="mb-3">TIPO DOCUMENTO, NUMERO DOCUMENTO, NOMBRES, APELLIDOS, CURSO</p>
                <p className="font-semibold mb-2">Opcionales:</p>
                <p>FECHA DE NACIMIENTO, SEXO, EPS, TIPO SANGRE, RH</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800 font-semibold mb-2">💡 Conversiones Automáticas:</p>
            <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
              <li>Fechas: 12/03/2008 → 2008-03-12 (automático)</li>
              <li>Mayúsculas: TI, CC, MADRE → ti, cc, madre (automático)</li>
              <li>Cursos: acepta IDs o códigos como `58_4A`</li>
              <li>No uses campos de estudiante que backend no soporta, como `BARRIO` o `ALERGIAS`</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleNext}>
              Siguiente: Cargar Archivos
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Subir Archivos */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-indigo-900">Sube dos archivos separados</p>
            <p className="text-sm text-indigo-700 mt-1">Uno para acudientes y otro para estudiantes. El sistema los unirá antes de enviarlos a `carga-masiva-completa`.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              📄 Archivo de Acudientes
            </label>
            <div
              onDrop={handleDropAcudientes}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-slate-50/50"
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileAcudientes}
                className="hidden"
                id="file-acudientes"
              />
              <label htmlFor="file-acudientes" className="cursor-pointer">
                <IconFileSpreadsheet className="mx-auto mb-3 text-blue-400" size={48} />
                {archivoAcudientes ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 rounded-lg">
                    <IconCheck size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">{archivoAcudientes.name}</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-700 mb-1">
                      Arrastra aquí el archivo de acudientes o haz clic para seleccionarlo
                    </p>
                    <p className="text-xs text-slate-500">
                      Excel (.xlsx, .xls) o CSV con los datos de acudientes
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              📄 Archivo de Estudiantes
            </label>
            <div
              onDrop={handleDropEstudiantes}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer bg-slate-50/50"
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileEstudiantes}
                className="hidden"
                id="file-estudiantes"
              />
              <label htmlFor="file-estudiantes" className="cursor-pointer">
                <IconFileSpreadsheet className="mx-auto mb-3 text-emerald-400" size={48} />
                {archivoEstudiantes ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 rounded-lg">
                    <IconCheck size={16} className="text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">{archivoEstudiantes.name}</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-700 mb-1">
                      Arrastra aquí el archivo de estudiantes o haz clic para seleccionarlo
                    </p>
                    <p className="text-xs text-slate-500">
                      Excel (.xlsx, .xls) o CSV con los datos de estudiantes
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <IconAlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Volver
            </Button>
            <Button 
              onClick={handleNext} 
              disabled={!archivoEstudiantes || !archivoAcudientes}
              className="flex-1"
            >
              {!archivoEstudiantes || !archivoAcudientes ? 'Selecciona ambos archivos' : 'Procesar Carga Masiva'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Resultado */}
      {step === 3 && (
        <div className="space-y-4">
          {processing ? (
            <div className="text-center py-12">
              <IconLoader className="mx-auto mb-4 text-indigo-600 animate-spin" size={64} />
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                Procesando archivos...
              </h3>
              <div className="max-w-md mx-auto">
                <div className="bg-slate-200 h-3 rounded-full overflow-hidden mb-2">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-slate-600">
                  {progress < 50 ? 'Validando hojas del Excel...' : progress < 80 ? 'Procesando acudientes y estudiantes...' : 'Finalizando...'}
                </p>
              </div>
            </div>
          ) : result ? (
            <div>
              {result.total_exitosos === 0 && (
                <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-6 mb-4">
                  <div className="flex items-start gap-3">
                    <IconAlertTriangle className="text-amber-600 flex-shrink-0 mt-1" size={32} />
                    <div>
                      <h3 className="font-bold text-amber-900 text-lg mb-2">⚠️ No se Crearon Registros</h3>
                      <p className="text-amber-800 mb-3">
                        El backend procesó el archivo pero <strong>no insertó acudientes ni estudiantes exitosamente</strong>. 
                        Esto generalmente ocurre por:
                      </p>
                      <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                        <li>Las columnas del Excel no coinciden con las esperadas</li>
                        <li>Los datos ya existen en el sistema (documentos duplicados)</li>
                        <li>Faltan campos obligatorios en los archivos</li>
                        <li>El formato de las fechas o datos no es válido</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl p-6 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <IconCheck className={result.total_exitosos > 0 ? "text-green-600" : "text-amber-600"} size={32} />
                  <h3 className="font-bold text-slate-800 text-lg">
                    {result.total_exitosos > 0 
                      ? '¡Carga Masiva Completada!' 
                      : 'Proceso Completado (Sin Registros Creados)'}
                  </h3>
                </div>

                {(result.hojas_procesadas?.acudientes || result.hojas_procesadas?.estudiantes) && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 text-sm text-slate-700">
                    <p><strong>Hoja de acudientes:</strong> {result.hojas_procesadas?.acudientes ?? 'No detectada'}</p>
                    <p><strong>Hoja de estudiantes:</strong> {result.hojas_procesadas?.estudiantes ?? 'No detectada'}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">{result.procesados}</div>
                    <div className="text-xs text-blue-600 mt-1">Registros Procesados</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">{result.acudientes.exitosos}</div>
                    <div className="text-xs text-green-600 mt-1">Acudientes Exitosos</div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-emerald-600">{result.estudiantes.exitosos}</div>
                    <div className="text-xs text-emerald-600 mt-1">Estudiantes Exitosos</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-amber-600">{result.total_errores}</div>
                    <div className="text-xs text-amber-600 mt-1">Errores Totales</div>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-indigo-600">{result.tasa_exito_general ?? '0%'}</div>
                    <div className="text-xs text-indigo-600 mt-1">Tasa de Éxito</div>
                  </div>
                </div>

                {countErroresDetalle(result.errores_detalle) > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-amber-800 mb-2">
                      ⚠️ {countErroresDetalle(result.errores_detalle)} registro(s) con errores:
                    </p>
                    <div className="space-y-1 mb-2">
                      {mergeErroresDetalle(result.errores_detalle).slice(0, 5).map((err, i) => (
                        <div key={i} className="text-xs text-red-700 font-semibold">
                          • {err.grupo} - Fila {err.fila}{err.tipo ? `, ${err.tipo}` : ''}: {err.error}
                        </div>
                      ))}
                      {countErroresDetalle(result.errores_detalle) > 5 && (
                        <div className="text-xs text-amber-700 italic">...y {countErroresDetalle(result.errores_detalle) - 5} más</div>
                      )}
                    </div>
                    <button
                      className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded text-xs font-semibold border border-amber-300 transition"
                      onClick={() => {
                        const csv = [
                          'grupo,fila,tipo,mensaje',
                          ...mergeErroresDetalle(result.errores_detalle).map(e => `${e.grupo},${e.fila},${e.tipo ?? ''},"${e.error.replace(/"/g, '""')}"`)
                        ].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'errores_carga_masiva.csv';
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(() => {
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }, 100);
                      }}
                    >
                      Descargar log de errores (CSV)
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button onClick={onClose} className="flex-1">
                  Finalizar
                </Button>
              </div>
            </div>
          ) : error ? (
            <div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <IconAlertTriangle className="mx-auto mb-3 text-red-600" size={48} />
                <h3 className="font-bold text-red-800 mb-2">Error al Procesar</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  Volver a Intentar
                </Button>
                <Button onClick={onClose} className="flex-1">
                  Cerrar
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
