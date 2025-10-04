import { Injectable } from '@angular/core';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MockService {
  getDiscussions() {
    return of([
      {
        theme: 'Тема',
        username: 'Username',
        timeAgo: 20,
        messagesCount: 5
      },
      {
        theme: 'Тема',
        username: 'Username',
        timeAgo: 20,
        messagesCount: 5
      },
      {
        theme: 'Тема',
        username: 'Username',
        timeAgo: 20,
        messagesCount: 5
      },
    ])
  }
}
