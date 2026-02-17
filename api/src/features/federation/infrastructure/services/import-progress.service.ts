import { Injectable } from '@nestjs/common';
import { Subject, Observable, filter } from 'rxjs';
import { AlbumImportProgressEvent } from './album-import.service';

@Injectable()
export class ImportProgressService {
  private progressSubject = new Subject<AlbumImportProgressEvent>();

  emit(event: AlbumImportProgressEvent): void {
    this.progressSubject.next(event);
  }

  subscribeForUser(userId: string): Observable<AlbumImportProgressEvent> {
    return this.progressSubject.asObservable().pipe(
      filter((event) => event.userId === userId),
    );
  }

  subscribeAll(): Observable<AlbumImportProgressEvent> {
    return this.progressSubject.asObservable();
  }
}
