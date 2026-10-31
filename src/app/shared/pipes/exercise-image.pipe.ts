import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '@env/environment';

/** Relative catalogue path (`Ab_Roller/0.jpg`) → absolute CDN URL. Returns '' for missing images. */
@Pipe({ name: 'exerciseImage' })
export class ExerciseImagePipe implements PipeTransform {
  transform(path: string | null | undefined): string {
    return path ? environment.exerciseImageBaseUrl + path : '';
  }
}
