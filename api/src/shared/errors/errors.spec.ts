import { BaseError, getHttpStatusForError, ERROR_HTTP_STATUS_MAP } from './base.error';
import { ConflictError } from './conflict.error';
import { ExternalApiError } from './external-api.error';
import { ForbiddenError } from './forbidden.error';
import { ImageProcessingError } from './image-processing.error';
import { InfrastructureError, RepositoryError } from './infrastructure.error';
import { NotFoundError } from './not-found.error';
import { TimeoutError } from './timeout.error';
import { UnauthorizedError } from './unauthorized.error';
import { ValidationError } from './validation.error';
import { ScannerError } from './scanner.error';

describe('Error Classes', () => {
  describe('BaseError', () => {
    it('should create error with code and message', () => {
      const error = new BaseError('TEST_CODE', 'Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.message).toBe('Test message');
    });

    it('should be instanceof Error', () => {
      const error = new BaseError('TEST_CODE', 'Test message');
      expect(error).toBeInstanceOf(Error);
    });

    it('should be instanceof BaseError', () => {
      const error = new BaseError('TEST_CODE', 'Test message');
      expect(error).toBeInstanceOf(BaseError);
    });
  });

  describe('getHttpStatusForError', () => {
    it('should return 404 for NOT_FOUND', () => {
      expect(getHttpStatusForError('NOT_FOUND')).toBe(404);
    });

    it('should return 400 for VALIDATION_ERROR', () => {
      expect(getHttpStatusForError('VALIDATION_ERROR')).toBe(400);
    });

    it('should return 401 for UNAUTHORIZED', () => {
      expect(getHttpStatusForError('UNAUTHORIZED')).toBe(401);
    });

    it('should return 403 for FORBIDDEN', () => {
      expect(getHttpStatusForError('FORBIDDEN')).toBe(403);
    });

    it('should return 409 for CONFLICT', () => {
      expect(getHttpStatusForError('CONFLICT')).toBe(409);
    });

    it('should return 422 for IMAGE_PROCESSING_ERROR', () => {
      expect(getHttpStatusForError('IMAGE_PROCESSING_ERROR')).toBe(422);
    });

    it('should return 409 for SCANNER_ERROR', () => {
      expect(getHttpStatusForError('SCANNER_ERROR')).toBe(409);
    });

    it('should return 502 for EXTERNAL_API_ERROR', () => {
      expect(getHttpStatusForError('EXTERNAL_API_ERROR')).toBe(502);
    });

    it('should return 504 for TIMEOUT_ERROR', () => {
      expect(getHttpStatusForError('TIMEOUT_ERROR')).toBe(504);
    });

    it('should return 503 for INFRASTRUCTURE_ERROR', () => {
      expect(getHttpStatusForError('INFRASTRUCTURE_ERROR')).toBe(503);
    });

    it('should return 500 for REPOSITORY_ERROR', () => {
      expect(getHttpStatusForError('REPOSITORY_ERROR')).toBe(500);
    });

    it('should return 500 for INTERNAL_ERROR', () => {
      expect(getHttpStatusForError('INTERNAL_ERROR')).toBe(500);
    });

    it('should return 500 for unknown error code', () => {
      expect(getHttpStatusForError('UNKNOWN_ERROR')).toBe(500);
    });

    it('should return 500 for empty string', () => {
      expect(getHttpStatusForError('')).toBe(500);
    });
  });

  describe('ConflictError', () => {
    it('should create error with CONFLICT code', () => {
      const error = new ConflictError('Resource already exists');
      expect(error.code).toBe('CONFLICT');
    });

    it('should set message correctly', () => {
      const error = new ConflictError('Resource already exists');
      expect(error.message).toBe('Resource already exists');
    });

    it('should be instanceof BaseError', () => {
      const error = new ConflictError('Resource already exists');
      expect(error).toBeInstanceOf(BaseError);
    });

    it('should be instanceof ConflictError', () => {
      const error = new ConflictError('Resource already exists');
      expect(error).toBeInstanceOf(ConflictError);
    });

    it('should be instanceof Error', () => {
      const error = new ConflictError('Resource already exists');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ExternalApiError', () => {
    it('should create error with provider, status, and statusText', () => {
      const error = new ExternalApiError('OpenAI', 429, 'Too Many Requests');
      expect(error.provider).toBe('OpenAI');
      expect(error.httpStatus).toBe(429);
      expect(error.httpStatusText).toBe('Too Many Requests');
    });

    it('should format message correctly', () => {
      const error = new ExternalApiError('OpenAI', 429, 'Too Many Requests');
      expect(error.message).toBe('OpenAI API error: HTTP 429 Too Many Requests');
    });

    it('should include url when provided', () => {
      const error = new ExternalApiError('OpenAI', 429, 'Too Many Requests', 'https://api.openai.com/v1/chat');
      expect(error.url).toBe('https://api.openai.com/v1/chat');
    });

    it('should have url as undefined when not provided', () => {
      const error = new ExternalApiError('OpenAI', 429, 'Too Many Requests');
      expect(error.url).toBeUndefined();
    });

    it('should have EXTERNAL_API_ERROR code', () => {
      const error = new ExternalApiError('OpenAI', 429, 'Too Many Requests');
      expect(error.code).toBe('EXTERNAL_API_ERROR');
    });

    it('should be instanceof BaseError', () => {
      const error = new ExternalApiError('OpenAI', 429, 'Too Many Requests');
      expect(error).toBeInstanceOf(BaseError);
    });

    it('should be instanceof ExternalApiError', () => {
      const error = new ExternalApiError('OpenAI', 429, 'Too Many Requests');
      expect(error).toBeInstanceOf(ExternalApiError);
    });
  });

  describe('ForbiddenError', () => {
    it('should use default message when not provided', () => {
      const error = new ForbiddenError();
      expect(error.message).toBe('Forbidden');
    });

    it('should use custom message when provided', () => {
      const error = new ForbiddenError('Access denied to this resource');
      expect(error.message).toBe('Access denied to this resource');
    });

    it('should have FORBIDDEN code', () => {
      const error = new ForbiddenError();
      expect(error.code).toBe('FORBIDDEN');
    });

    it('should be instanceof BaseError', () => {
      const error = new ForbiddenError();
      expect(error).toBeInstanceOf(BaseError);
    });

    it('should be instanceof ForbiddenError', () => {
      const error = new ForbiddenError();
      expect(error).toBeInstanceOf(ForbiddenError);
    });
  });

  describe('ImageProcessingError', () => {
    describe('INVALID_DIMENSIONS', () => {
      it('should use default message when details not provided', () => {
        const error = new ImageProcessingError('INVALID_DIMENSIONS');
        expect(error.message).toBe('Failed to detect image dimensions');
      });

      it('should use details when provided', () => {
        const error = new ImageProcessingError('INVALID_DIMENSIONS', 'Width is 0');
        expect(error.message).toBe('Width is 0');
      });

      it('should store reason', () => {
        const error = new ImageProcessingError('INVALID_DIMENSIONS');
        expect(error.reason).toBe('INVALID_DIMENSIONS');
      });
    });

    describe('INVALID_CONTENT_TYPE', () => {
      it('should format message with content type', () => {
        const error = new ImageProcessingError('INVALID_CONTENT_TYPE', 'text/html');
        expect(error.message).toBe('Invalid content type: text/html');
      });

      it('should handle missing details', () => {
        const error = new ImageProcessingError('INVALID_CONTENT_TYPE');
        expect(error.message).toBe('Invalid content type: undefined');
      });
    });

    describe('FILE_TOO_LARGE', () => {
      it('should format message with size details', () => {
        const error = new ImageProcessingError('FILE_TOO_LARGE', '15MB');
        expect(error.message).toBe('Image too large: 15MB');
      });

      it('should handle missing details', () => {
        const error = new ImageProcessingError('FILE_TOO_LARGE');
        expect(error.message).toBe('Image too large: undefined');
      });
    });

    describe('INVALID_IMAGE', () => {
      it('should use standard message', () => {
        const error = new ImageProcessingError('INVALID_IMAGE');
        expect(error.message).toBe('Downloaded file is not a valid image');
      });

      it('should ignore details for INVALID_IMAGE', () => {
        const error = new ImageProcessingError('INVALID_IMAGE', 'corrupt data');
        expect(error.message).toBe('Downloaded file is not a valid image');
      });
    });

    describe('DOWNLOAD_FAILED', () => {
      it('should use default message when details not provided', () => {
        const error = new ImageProcessingError('DOWNLOAD_FAILED');
        expect(error.message).toBe('Failed to download image');
      });

      it('should use details when provided', () => {
        const error = new ImageProcessingError('DOWNLOAD_FAILED', 'Network timeout');
        expect(error.message).toBe('Network timeout');
      });
    });

    it('should have IMAGE_PROCESSING_ERROR code', () => {
      const error = new ImageProcessingError('INVALID_IMAGE');
      expect(error.code).toBe('IMAGE_PROCESSING_ERROR');
    });

    it('should store details when provided', () => {
      const error = new ImageProcessingError('FILE_TOO_LARGE', '15MB');
      expect(error.details).toBe('15MB');
    });

    it('should have undefined details when not provided', () => {
      const error = new ImageProcessingError('INVALID_IMAGE');
      expect(error.details).toBeUndefined();
    });

    it('should be instanceof BaseError', () => {
      const error = new ImageProcessingError('INVALID_IMAGE');
      expect(error).toBeInstanceOf(BaseError);
    });

    it('should be instanceof ImageProcessingError', () => {
      const error = new ImageProcessingError('INVALID_IMAGE');
      expect(error).toBeInstanceOf(ImageProcessingError);
    });
  });

  describe('InfrastructureError', () => {
    it('should format message for REDIS component', () => {
      const error = new InfrastructureError('REDIS', 'Connection refused');
      expect(error.message).toBe('REDIS error: Connection refused');
      expect(error.component).toBe('REDIS');
    });

    it('should format message for DATABASE component', () => {
      const error = new InfrastructureError('DATABASE', 'Query timeout');
      expect(error.message).toBe('DATABASE error: Query timeout');
      expect(error.component).toBe('DATABASE');
    });

    it('should format message for FILESYSTEM component', () => {
      const error = new InfrastructureError('FILESYSTEM', 'Permission denied');
      expect(error.message).toBe('FILESYSTEM error: Permission denied');
      expect(error.component).toBe('FILESYSTEM');
    });

    it('should format message for QUEUE component', () => {
      const error = new InfrastructureError('QUEUE', 'Queue is full');
      expect(error.message).toBe('QUEUE error: Queue is full');
      expect(error.component).toBe('QUEUE');
    });

    it('should have INFRASTRUCTURE_ERROR code', () => {
      const error = new InfrastructureError('REDIS', 'Connection refused');
      expect(error.code).toBe('INFRASTRUCTURE_ERROR');
    });

    it('should store reason', () => {
      const error = new InfrastructureError('REDIS', 'Connection refused');
      expect(error.reason).toBe('Connection refused');
    });

    it('should be instanceof BaseError', () => {
      const error = new InfrastructureError('REDIS', 'Connection refused');
      expect(error).toBeInstanceOf(BaseError);
    });

    it('should be instanceof InfrastructureError', () => {
      const error = new InfrastructureError('REDIS', 'Connection refused');
      expect(error).toBeInstanceOf(InfrastructureError);
    });
  });

  describe('RepositoryError', () => {
    it('should format message with operation and reason', () => {
      const error = new RepositoryError('save', 'Database connection lost');
      expect(error.message).toBe('Repository save failed: Database connection lost');
    });

    it('should store operation', () => {
      const error = new RepositoryError('delete', 'Record not found');
      expect(error.operation).toBe('delete');
    });

    it('should store reason', () => {
      const error = new RepositoryError('update', 'Constraint violation');
      expect(error.reason).toBe('Constraint violation');
    });

    it('should have REPOSITORY_ERROR code', () => {
      const error = new RepositoryError('find', 'Query error');
      expect(error.code).toBe('REPOSITORY_ERROR');
    });

    it('should be instanceof BaseError', () => {
      const error = new RepositoryError('save', 'Error');
      expect(error).toBeInstanceOf(BaseError);
    });

    it('should be instanceof RepositoryError', () => {
      const error = new RepositoryError('save', 'Error');
      expect(error).toBeInstanceOf(RepositoryError);
    });
  });

  describe('NotFoundError', () => {
    it('should format message without id', () => {
      const error = new NotFoundError('User');
      expect(error.message).toBe('User not found');
    });

    it('should format message with id', () => {
      const error = new NotFoundError('User', '12345');
      expect(error.message).toBe('User with id 12345 not found');
    });

    it('should have NOT_FOUND code', () => {
      const error = new NotFoundError('User');
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should be instanceof BaseError', () => {
      const error = new NotFoundError('User');
      expect(error).toBeInstanceOf(BaseError);
    });

    it('should be instanceof NotFoundError', () => {
      const error = new NotFoundError('User');
      expect(error).toBeInstanceOf(NotFoundError);
    });
  });

  describe('TimeoutError', () => {
    it('should format message without operation', () => {
      const error = new TimeoutError(5000);
      expect(error.message).toBe('Request timed out after 5000ms');
      expect(error.timeoutMs).toBe(5000);
    });

    it('should format message with operation', () => {
      const error = new TimeoutError(3000, 'Database query');
      expect(error.message).toBe('Database query timed out after 3000ms');
      expect(error.timeoutMs).toBe(3000);
      expect(error.operation).toBe('Database query');
    });

    it('should have TIMEOUT_ERROR code', () => {
      const error = new TimeoutError(5000);
      expect(error.code).toBe('TIMEOUT_ERROR');
    });

    it('should be instanceof BaseError', () => {
      const error = new TimeoutError(5000);
      expect(error).toBeInstanceOf(BaseError);
    });

    it('should be instanceof TimeoutError', () => {
      const error = new TimeoutError(5000);
      expect(error).toBeInstanceOf(TimeoutError);
    });
  });

  describe('UnauthorizedError', () => {
    it('should use default message when not provided', () => {
      const error = new UnauthorizedError();
      expect(error.message).toBe('Unauthorized');
    });

    it('should use custom message when provided', () => {
      const error = new UnauthorizedError('Invalid token');
      expect(error.message).toBe('Invalid token');
    });

    it('should have UNAUTHORIZED code', () => {
      const error = new UnauthorizedError();
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should be instanceof BaseError', () => {
      const error = new UnauthorizedError();
      expect(error).toBeInstanceOf(BaseError);
    });

    it('should be instanceof UnauthorizedError', () => {
      const error = new UnauthorizedError();
      expect(error).toBeInstanceOf(UnauthorizedError);
    });
  });

  describe('ValidationError', () => {
    it('should create error with message', () => {
      const error = new ValidationError('Email is required');
      expect(error.message).toBe('Email is required');
    });

    it('should have VALIDATION_ERROR code', () => {
      const error = new ValidationError('Email is required');
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should be instanceof BaseError', () => {
      const error = new ValidationError('Email is required');
      expect(error).toBeInstanceOf(BaseError);
    });

    it('should be instanceof ValidationError', () => {
      const error = new ValidationError('Email is required');
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe('ScannerError', () => {
    describe('SCAN_ALREADY_RUNNING', () => {
      it('should use standard message', () => {
        const error = new ScannerError('SCAN_ALREADY_RUNNING');
        expect(error.message).toBe('A scan is already running. Please wait for it to complete.');
      });

      it('should ignore details for SCAN_ALREADY_RUNNING', () => {
        const error = new ScannerError('SCAN_ALREADY_RUNNING', 'custom details');
        expect(error.message).toBe('A scan is already running. Please wait for it to complete.');
      });

      it('should store reason', () => {
        const error = new ScannerError('SCAN_ALREADY_RUNNING');
        expect(error.reason).toBe('SCAN_ALREADY_RUNNING');
      });
    });

    describe('NO_LIBRARY_PATH', () => {
      it('should use standard message', () => {
        const error = new ScannerError('NO_LIBRARY_PATH');
        expect(error.message).toBe('No library path configured');
      });

      it('should ignore details for NO_LIBRARY_PATH', () => {
        const error = new ScannerError('NO_LIBRARY_PATH', 'custom details');
        expect(error.message).toBe('No library path configured');
      });
    });

    describe('INVALID_PATH', () => {
      it('should use default message when details not provided', () => {
        const error = new ScannerError('INVALID_PATH');
        expect(error.message).toBe('Invalid library path');
      });

      it('should use details when provided', () => {
        const error = new ScannerError('INVALID_PATH', 'Path does not exist: /invalid/path');
        expect(error.message).toBe('Path does not exist: /invalid/path');
      });
    });

    it('should have SCANNER_ERROR code', () => {
      const error = new ScannerError('SCAN_ALREADY_RUNNING');
      expect(error.code).toBe('SCANNER_ERROR');
    });

    it('should store details when provided', () => {
      const error = new ScannerError('INVALID_PATH', 'Path does not exist');
      expect(error.details).toBe('Path does not exist');
    });

    it('should have undefined details when not provided', () => {
      const error = new ScannerError('NO_LIBRARY_PATH');
      expect(error.details).toBeUndefined();
    });

    it('should be instanceof BaseError', () => {
      const error = new ScannerError('SCAN_ALREADY_RUNNING');
      expect(error).toBeInstanceOf(BaseError);
    });

    it('should be instanceof ScannerError', () => {
      const error = new ScannerError('SCAN_ALREADY_RUNNING');
      expect(error).toBeInstanceOf(ScannerError);
    });
  });
});
