// Middleware para manejo de errores globales
import { validationResult } from 'express-validator';

// Validador de requests para express-validator
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg || err.message);
    return res.status(400).json({ 
      success: false, 
      message: 'Error de validación',
      errors: errorMessages
    });
  }
  next();
};

// Manejador de errores global
export const globalErrorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.stack}`);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

