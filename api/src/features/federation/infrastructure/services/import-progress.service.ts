import { Injectable } from '@nestjs/common';
import { Subject, Observable, filter } from 'rxjs';
import { AlbumImportProgressEvent } from './album-import.service';

/**
 * Service to broadcast import progress events via SSE
 * Used as an alternative to WebSocket for more reliable delivery
 */
@Injectable()
export class ImportProgressService {
  private progressSubject = new Subject<AlbumImportProgressEvent>();

  /**
   * Emit a progress event to all subscribers
   */
  emit(event: AlbumImportProgressEvent): void {
    this.progressSubject.next(event);
  }

  /**
   * Subscribe to progress events for a specific user
   */
  subscribeForUser(userId: string): Observable<AlbumImportProgressEvent> {
    return this.progressSubject.asObservable().pipe(
      filter((event) => event.userId === userId),
    );
  }

  /**
   * Subscribe to all progress events
   */
  subscribeAll(): Observable<AlbumImportProgressEvent> {
    return this.progressSubject.asObservable();
  }
}
