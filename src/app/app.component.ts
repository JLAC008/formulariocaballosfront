import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type BookingType = 'routes' | 'lessons';

interface Experience {
  id: number;
  type: BookingType;
  title: string;
  description: string;
  level: string;
  duration: string;
  price: number;
  image: string;
}

interface CalendarDay {
  day: number | null;
  date: Date | null;
  disabled?: boolean;
  today?: boolean;
}

interface BonusPack {
  amount: number;
  price: number;
}

interface BookingHistoryItem {
  id: number;
  type: BookingType;
  title: string;
  date: string;
  hour: string;
  payment: string;
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

const LONG_WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly navItems = ['Inicio', 'Rutas a caballo', 'Clases de equitación', 'Sobre nosotros', 'Contacto'];
  readonly weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly hours = ['09:00', '11:30', '17:00', '18:30'];
  readonly bonusPacks: BonusPack[] = [
    { amount: 1, price: 20 },
    { amount: 5, price: 90 },
    { amount: 10, price: 160 }
  ];
  readonly minDate = this.startOfDay(new Date());
  readonly maxDate = this.addMonths(this.minDate, 3);

  activeType: BookingType = 'routes';
  selectedExperienceIds: number[] = [];
  visibleMonth = new Date(this.minDate.getFullYear(), this.minDate.getMonth(), 1);
  selectedDate = new Date(this.minDate);
  selectedHour = '18:30';
  people = 1;
  lessonBonuses = 3;
  isBonusModalOpen = false;
  isReservationModalOpen = false;
  isHistoryModalOpen = false;
  reservationMessage = '';
  bookingHistory: BookingHistoryItem[] = [];
  customerName = 'Paco Martínez';
  phone = '633 443 322';
  confirmation = '';
  warning = '';

  readonly experiences: Experience[] = [
    {
      id: 1,
      type: 'routes',
      title: 'Ruta del Sendero Real',
      description: 'Recorrido sereno por campos de olivos y senderos de tierra, ideal para disfrutar del paisaje al paso.',
      level: 'Principiante',
      duration: '90 min',
      price: 45,
      image: 'assets/route-sendero.jpg'
    },
    {
      id: 2,
      type: 'routes',
      title: 'Ruta del Crepúsculo',
      description: 'Paseo al atardecer por las colinas con vistas panorámicas. Una experiencia inolvidable.',
      level: 'Intermedio',
      duration: '120 min',
      price: 60,
      image: 'assets/route-crepusculo.jpg'
    },
    {
      id: 3,
      type: 'routes',
      title: 'Ruta de Galope Avanzado',
      description: 'Para jinetes con experiencia. Tramos a galope por campos abiertos con guía profesional.',
      level: 'Avanzado',
      duration: '150 min',
      price: 80,
      image: 'assets/route-galope.jpg'
    },
    {
      id: 4,
      type: 'lessons',
      title: 'Clase de Iniciación',
      description: 'Sesión guiada en pista para aprender postura, control básico y seguridad desde cero.',
      level: 'Principiante',
      duration: '60 min',
      price: 38,
      image: 'assets/route-sendero.jpg'
    },
    {
      id: 5,
      type: 'lessons',
      title: 'Clase Técnica Privada',
      description: 'Trabajo personalizado para mejorar ayudas, asiento y confianza con seguimiento individual.',
      level: 'Intermedio',
      duration: '75 min',
      price: 55,
      image: 'assets/route-crepusculo.jpg'
    }
  ];

  get filteredExperiences(): Experience[] {
    return this.experiences.filter((experience) => experience.type === this.activeType);
  }

  get selectedExperiences(): Experience[] {
    return this.filteredExperiences.filter((experience) => this.selectedExperienceIds.includes(experience.id));
  }

  get selectedExperienceTitle(): string {
    return this.selectedExperiences.map((experience) => experience.title).join(', ');
  }

  get total(): number {
    return this.selectedExperiences.reduce((sum, experience) => sum + experience.price, 0) * this.people;
  }

  get isLesson(): boolean {
    return this.activeType === 'lessons';
  }

  get monthLabel(): string {
    return `${MONTH_NAMES[this.visibleMonth.getMonth()]} ${this.visibleMonth.getFullYear()}`;
  }

  get calendar(): CalendarDay[] {
    const year = this.visibleMonth.getFullYear();
    const month = this.visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const days: CalendarDay[] = Array.from({ length: mondayOffset }, () => ({
      day: null,
      date: null,
      disabled: true
    }));

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      days.push({
        day,
        date,
        disabled: !this.isInBookingRange(date),
        today: this.isSameDate(date, this.minDate)
      });
    }

    return days;
  }

  get canGoPreviousMonth(): boolean {
    return this.visibleMonth > new Date(this.minDate.getFullYear(), this.minDate.getMonth(), 1);
  }

  get canGoNextMonth(): boolean {
    return this.visibleMonth < new Date(this.maxDate.getFullYear(), this.maxDate.getMonth(), 1);
  }

  get formattedDate(): string {
    const weekday = LONG_WEEKDAYS[this.selectedDate.getDay()];
    const day = this.selectedDate.getDate();
    const month = MONTH_NAMES[this.selectedDate.getMonth()];
    const year = this.selectedDate.getFullYear();
    return `${weekday}, ${day} de ${month} ${year}`;
  }

  get summarySelectionLabel(): string {
    return this.isLesson
      ? `Clases seleccionadas (${this.selectedExperiences.length})`
      : `Rutas seleccionadas (${this.selectedExperiences.length})`;
  }

  get actionLabel(): string {
    return this.isLesson ? 'Reservar con bono' : 'Reservar y pagar';
  }

  get actionHelpText(): string {
    return this.isLesson
      ? 'Se descontará 1 bono al reservar · Confirmación inmediata'
      : 'Pago registrado en el momento · Confirmación inmediata';
  }

  get canReserve(): boolean {
    return this.selectedExperiences.length > 0 && (!this.isLesson || this.lessonBonuses >= this.selectedExperiences.length);
  }

  setType(type: BookingType): void {
    this.activeType = type;
    this.selectedExperienceIds = [];
    this.confirmation = '';
    this.warning = '';
  }

  selectExperience(id: number): void {
    if (this.selectedExperienceIds.includes(id)) {
      this.selectedExperienceIds = this.selectedExperienceIds.filter((selectedId) => selectedId !== id);
    } else {
      this.selectedExperienceIds = [...this.selectedExperienceIds, id];
    }
    this.confirmation = '';
    this.warning = '';
  }

  selectDay(day: CalendarDay): void {
    if (!day.date || day.disabled) {
      return;
    }

    this.selectedDate = new Date(day.date);
    this.confirmation = '';
    this.warning = '';
  }

  selectHour(hour: string): void {
    this.selectedHour = hour;
    this.confirmation = '';
    this.warning = '';
  }

  changeMonth(delta: number): void {
    const nextMonth = new Date(this.visibleMonth.getFullYear(), this.visibleMonth.getMonth() + delta, 1);
    const firstAllowedMonth = new Date(this.minDate.getFullYear(), this.minDate.getMonth(), 1);
    const lastAllowedMonth = new Date(this.maxDate.getFullYear(), this.maxDate.getMonth(), 1);

    if (nextMonth < firstAllowedMonth || nextMonth > lastAllowedMonth) {
      return;
    }

    this.visibleMonth = nextMonth;
  }

  reserve(): void {
    const selectedCount = this.selectedExperiences.length;

    if (selectedCount === 0) {
      this.warning = 'Selecciona al menos una opción para poder reservar.';
      this.confirmation = '';
      return;
    }

    if (this.isLesson && this.lessonBonuses < selectedCount) {
      this.warning = 'No tienes bonos suficientes. Compra más bonos para poder reservar estas clases.';
      this.confirmation = '';
      return;
    }

    if (this.isLesson) {
      this.lessonBonuses -= selectedCount;
    }

    this.bookingHistory.unshift({
      id: Date.now(),
      type: this.activeType,
      title: this.selectedExperienceTitle,
      date: this.formattedDate,
      hour: this.selectedHour,
      payment: this.isLesson
        ? `${selectedCount} bono${selectedCount === 1 ? '' : 's'}`
        : `${this.total.toFixed(2)} €`
    });

    this.reservationMessage = this.isLesson
      ? `Has reservado ${selectedCount} clase${selectedCount === 1 ? '' : 's'}. Te quedan ${this.lessonBonuses} bono${this.lessonBonuses === 1 ? '' : 's'}.`
      : `Has reservado ${selectedCount} ruta${selectedCount === 1 ? '' : 's'}.`;
    this.isReservationModalOpen = true;
    this.confirmation = '';
    this.warning = this.isLesson && this.lessonBonuses === 0
      ? 'Has agotado tus bonos. Compra más bonos para reservar nuevas clases.'
      : '';
  }

  openBonusModal(): void {
    this.isBonusModalOpen = true;
    this.confirmation = '';
  }

  closeBonusModal(): void {
    this.isBonusModalOpen = false;
  }

  closeReservationModal(): void {
    this.isReservationModalOpen = false;
  }

  openHistoryModal(): void {
    this.isHistoryModalOpen = true;
  }

  closeHistoryModal(): void {
    this.isHistoryModalOpen = false;
  }

  purchaseBonuses(pack: BonusPack): void {
    this.lessonBonuses += pack.amount;
    this.isBonusModalOpen = false;
    this.warning = '';
    this.confirmation = `Has comprado ${pack.amount} bono${pack.amount === 1 ? '' : 's'} por ${pack.price} €. Ahora tienes ${this.lessonBonuses} bono${this.lessonBonuses === 1 ? '' : 's'} disponibles.`;
  }

  private addMonths(date: Date, months: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private isInBookingRange(date: Date): boolean {
    const day = this.startOfDay(date);
    return day >= this.minDate && day <= this.maxDate;
  }

  private isSameDate(first: Date, second: Date): boolean {
    return first.getFullYear() === second.getFullYear()
      && first.getMonth() === second.getMonth()
      && first.getDate() === second.getDate();
  }
}
