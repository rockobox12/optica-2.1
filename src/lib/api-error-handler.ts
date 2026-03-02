import { toast } from '@/hooks/use-toast';

interface ApiErrorOptions {
  showToast?: boolean;
  redirectOnUnauthorized?: boolean;
}

interface ApiErrorResult {
  message: string;
  code: string | null;
  status: number | null;
  fieldErrors: Record<string, string>;
  isRetryable: boolean;
}

/**
 * Parse field-specific errors from API response
 */
function parseFieldErrors(error: unknown): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  
  if (typeof error === 'object' && error !== null) {
    const err = error as { 
      code?: string; 
      message?: string; 
      details?: string;
      constraint?: string;
    };
    
    // Handle unique constraint violations (409/23505)
    if (err.code === '23505' || err.constraint) {
      const constraint = err.constraint || err.details || err.message || '';
      
      if (constraint.includes('email')) {
        fieldErrors.email = 'Este correo electrónico ya está registrado';
      }
      if (constraint.includes('professional_license') || constraint.includes('cedula')) {
        fieldErrors.professional_license = 'Esta cédula profesional ya está registrada';
      }
      if (constraint.includes('username')) {
        fieldErrors.username = 'Este nombre de usuario ya está en uso';
      }
      if (constraint.includes('phone')) {
        fieldErrors.phone = 'Este número de teléfono ya está registrado';
      }
      
      // Generic duplicate if no specific field found
      if (Object.keys(fieldErrors).length === 0) {
        fieldErrors._general = 'Este registro ya existe en el sistema';
      }
    }
  }
  
  return fieldErrors;
}

/**
 * Handles API errors gracefully without breaking the app
 */
export function handleApiError(
  error: unknown,
  context: string = 'operación',
  options: ApiErrorOptions = {}
): ApiErrorResult {
  const { showToast = true, redirectOnUnauthorized = false } = options;
  
  let message = 'Ha ocurrido un error inesperado';
  let code: string | null = null;
  let status: number | null = null;
  let isRetryable = false;
  const fieldErrors = parseFieldErrors(error);

  if (error instanceof Error) {
    message = error.message;
  }

  // Handle Supabase/PostgrestError
  if (typeof error === 'object' && error !== null) {
    const err = error as { 
      code?: string; 
      message?: string; 
      status?: number;
      statusCode?: number;
    };
    code = err.code ?? null;
    status = err.status ?? err.statusCode ?? null;

    switch (err.code) {
      case 'PGRST301':
      case '401':
        message = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        if (redirectOnUnauthorized) {
          window.location.href = '/auth';
        }
        break;
      case 'PGRST302':
      case '403':
        message = 'No tienes permisos para realizar esta acción.';
        break;
      case '500':
      case 'PGRST500':
        message = 'Error en el servidor. Por favor, intenta más tarde.';
        isRetryable = true;
        break;
      case '23505':
        // Use field-specific message if available
        message = Object.values(fieldErrors)[0] || 'Este registro ya existe.';
        break;
      case '23503':
        message = 'No se puede eliminar porque tiene registros relacionados.';
        break;
      case '23502':
        message = 'Faltan campos obligatorios.';
        break;
      case '22P02':
        message = 'Formato de datos inválido.';
        break;
      case 'user_already_exists':
        message = 'Este correo electrónico ya está registrado.';
        fieldErrors.email = message;
        break;
      default:
        if (err.message) {
          // Check for common Supabase Auth errors
          if (err.message.includes('already registered') || err.message.includes('already exists')) {
            message = 'Este correo electrónico ya está registrado.';
            fieldErrors.email = message;
          } else if (err.message.includes('invalid email')) {
            message = 'El correo electrónico no es válido.';
            fieldErrors.email = message;
          } else if (err.message.includes('weak password') || err.message.includes('Password')) {
            message = 'La contraseña no cumple con los requisitos de seguridad.';
            fieldErrors.password = message;
          } else {
            message = err.message;
          }
        }
    }

    // Handle HTTP status codes
    if (err.status) {
      status = err.status;
      switch (err.status) {
        case 400:
          if (!Object.keys(fieldErrors).length) {
            message = 'Los datos enviados no son válidos. Revisa los campos e intenta de nuevo.';
          }
          break;
        case 401:
          message = 'Sesión expirada. Por favor, inicia sesión.';
          if (redirectOnUnauthorized) {
            window.location.href = '/auth';
          }
          break;
        case 403:
          message = 'No tienes permisos para esta acción.';
          break;
        case 404:
          message = 'El recurso solicitado no existe.';
          break;
        case 409:
          message = Object.values(fieldErrors)[0] || 'Este registro ya existe.';
          break;
        case 500:
        case 502:
        case 503:
          message = 'Error del servidor. Intenta más tarde.';
          isRetryable = true;
          break;
      }
    }
  }

  if (import.meta.env.DEV) {
    console.error(`🚨 API Error [${context}]:`, { error, code, status, fieldErrors });
  }

  if (showToast) {
    toast({
      variant: 'destructive',
      title: `Error en ${context}`,
      description: message,
    });
  }

  return { message, code, status, fieldErrors, isRetryable };
}

/**
 * Get user-friendly error message for common scenarios
 */
export function getErrorMessage(
  status: number | null,
  context: 'session' | 'permission' | 'server' | 'validation' | 'duplicate' = 'server'
): string {
  const messages: Record<string, Record<number, string>> = {
    session: {
      401: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
      403: 'No tienes acceso a este recurso.',
    },
    permission: {
      403: 'No tienes permisos para realizar esta acción.',
    },
    server: {
      500: 'Error del servidor. Por favor intenta de nuevo.',
      502: 'El servidor no está disponible. Intenta más tarde.',
      503: 'Servicio temporalmente no disponible.',
    },
    validation: {
      400: 'Los datos proporcionados no son válidos.',
    },
    duplicate: {
      409: 'Este registro ya existe en el sistema.',
    },
  };

  if (status && messages[context]?.[status]) {
    return messages[context][status];
  }

  return 'Ha ocurrido un error inesperado.';
}

/**
 * Wrapper for async operations with error handling
 */
export async function safeApiCall<T>(
  operation: () => Promise<T>,
  context: string = 'operación',
  options: ApiErrorOptions = {}
): Promise<{ data: T | null; error: ApiErrorResult | null }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    const result = handleApiError(error, context, options);
    return { data: null, error: result };
  }
}
