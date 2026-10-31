import { Directive, ElementRef, inject } from '@angular/core';

// Neutral placeholder (dumbbell glyph) inlined so it works offline.
const FALLBACK_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#f3f3f4"/>` +
      `<g stroke="#a6a7ab" stroke-width="4" stroke-linecap="round"><path d="M24 40h32"/><path d="M20 30v20"/><path d="M60 30v20"/><path d="M14 34v12"/><path d="M66 34v12"/></g></svg>`,
  );

/**
 * `<img appImgFallback loading="lazy" [src]="...">` — swaps to a placeholder when the image fails to load.
 * Set `loading="lazy"` as a static attribute so it applies before `src`.
 */
@Directive({
  selector: 'img[appImgFallback]',
  host: {
    '(error)': 'useFallback()',
    decoding: 'async',
  },
})
export class ImgFallbackDirective {
  private readonly img = inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;

  protected useFallback(): void {
    if (this.img.src !== FALLBACK_SRC) this.img.src = FALLBACK_SRC;
  }
}
