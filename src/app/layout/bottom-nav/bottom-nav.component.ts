import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, CalendarDays, Dumbbell, House, ListChecks } from 'lucide-angular';

interface NavItem {
  path: string;
  label: string;
  icon: typeof House;
}

@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <nav aria-label="Main">
      @for (item of items; track item.path) {
        <a class="item" [routerLink]="item.path" routerLinkActive="item--active" #rla="routerLinkActive" [attr.aria-current]="rla.isActive ? 'page' : null">
          <lucide-icon [img]="item.icon" [size]="20" />
          <span class="label">{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styleUrl: './bottom-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavComponent {
  protected readonly items: NavItem[] = [
    { path: '/home', label: 'Home', icon: House },
    { path: '/routines', label: 'Routines', icon: ListChecks },
    { path: '/exercises', label: 'Exercises', icon: Dumbbell },
    { path: '/history', label: 'History', icon: CalendarDays },
  ];
}
