import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type BookingType = 'routes' | 'lessons';
type AppView = 'client' | 'login' | 'admin';
type AdminTab = 'schedule' | 'experiences' | 'reservations' | 'stats';
type ReservationStatus = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

interface Experience {
  id: number;
  type: BookingType;
  title: string;
  description: string;
  level: string;
  duration: string;
  price: number;
  image: string;
  active: boolean;
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
  dateKey: string;
  hour: string;
  payment: string;
  customerName: string;
  phone: string;
  amount: number;
  status: ReservationStatus;
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

const LONG_WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const SESSION_KEY = 'centro_ecuestre_admin_session';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly navItems = ['Inicio', 'Rutas a caballo', 'Clases de equitacion', 'Sobre nosotros', 'Contacto'];
  readonly weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  readonly hours = ['09:00', '11:30', '17:00', '18:30'];
  readonly bonusPacks: BonusPack[] = [
    { amount: 1, price: 20 },
    { amount: 5, price: 90 },
    { amount: 10, price: 160 }
  ];
  readonly minDate = this.startOfDay(new Date());
  readonly maxDate = this.addMonths(this.minDate, 3);

  view: AppView = this.isAdminLoggedIn() && window.location.pathname.includes('admin') ? 'admin' : 'client';
  activeType: BookingType = 'routes';
  activeAdminTab: AdminTab = 'schedule';
  selectedExperienceIds: number[] = [];
  visibleMonth = new Date(this.minDate.getFullYear(), this.minDate.getMonth(), 1);
  selectedDate = new Date(this.minDate);
  adminDate = this.toDateKey(this.minDate);
  selectedHour = '18:30';
  people = 1;
  lessonBonuses = 3;
  isBonusModalOpen = false;
  isReservationModalOpen = false;
  isHistoryModalOpen = false;
  isExperienceModalOpen = false;
  reservationMessage = '';
  bookingHistory: BookingHistoryItem[] = [];
  customerName = 'Paco Martinez';
  phone = '633 443 322';
  confirmation = '';
  warning = '';
  loginUser = 'admin';
  loginPassword = '';
  loginError = '';
  reservationFilter: 'all' | ReservationStatus = 'all';
  editingExperience: Experience | null = null;
  experienceForm: Experience = this.blankExperience();

  experiences: Experience[] = [
    {
      id: 1,
      type: 'routes',
      title: 'Ruta del Sendero Real',
      description: 'Recorrido sereno por campos de olivos y senderos de tierra, ideal para disfrutar del paisaje al paso.',
      level: 'Principiante',
      duration: '90 min',
      price: 45,
      image: 'assets/route-sendero.jpg',
      active: true
    },
    {
      id: 2,
      type: 'routes',
      title: 'Ruta del Crepusculo',
      description: 'Paseo al atardecer por las colinas con vistas panoramicas. Una experiencia inolvidable.',
      level: 'Intermedio',
      duration: '120 min',
      price: 60,
      image: 'assets/route-crepusculo.jpg',
      active: true
    },
    {
      id: 3,
      type: 'routes',
      title: 'Ruta de Galope Avanzado',
      description: 'Para jinetes con experiencia. Tramos a galope por campos abiertos con guia profesional.',
      level: 'Avanzado',
      duration: '150 min',
      price: 80,
      image: 'assets/route-galope.jpg',
      active: true
    },
    {
      id: 4,
      type: 'lessons',
      title: 'Clase de Iniciacion',
      description: 'Sesion guiada en pista para aprender postura, control basico y seguridad desde cero.',
      level: 'Principiante',
      duration: '60 min',
      price: 38,
      image: 'assets/route-sendero.jpg',
      active: true
    },
    {
      id: 5,
      type: 'lessons',
      title: 'Clase Tecnica Privada',
      description: 'Trabajo personalizado para mejorar ayudas, asiento y confianza con seguimiento individual.',
      level: 'Intermedio',
      duration: '75 min',
      price: 55,
      image: 'assets/route-crepusculo.jpg',
      active: true
    }
  ];

  get filteredExperiences(): Experience[] {
    return this.experiences.filter((experience) => experience.type === this.activeType && experience.active);
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
      ? 'Se descontara 1 bono al reservar · Confirmacion inmediata'
      : 'Pago registrado en el momento · Confirmacion inmediata';
  }

  get canReserve(): boolean {
    return this.selectedExperiences.length > 0 && (!this.isLesson || this.lessonBonuses >= this.selectedExperiences.length);
  }

  get adminDayReservations(): BookingHistoryItem[] {
    return this.bookingHistory.filter((booking) => booking.dateKey === this.adminDate && booking.status !== 'CANCELLED');
  }

  get filteredReservations(): BookingHistoryItem[] {
    return this.bookingHistory.filter((booking) => this.reservationFilter === 'all' || booking.status === this.reservationFilter);
  }

  get activeExperiencesCount(): number {
    return this.experiences.filter((experience) => experience.active).length;
  }

  get confirmedReservationsCount(): number {
    return this.bookingHistory.filter((booking) => booking.status === 'CONFIRMED').length;
  }

  get totalRevenue(): number {
    return this.bookingHistory
      .filter((booking) => booking.status !== 'CANCELLED' && booking.type === 'routes')
      .reduce((sum, booking) => sum + booking.amount, 0);
  }

  get pendingLessonsToday(): number {
    return this.adminDayReservations.filter((booking) => booking.type === 'lessons').length;
  }

  get mostPopularExperience(): string {
    const counts = new Map<string, number>();
    this.bookingHistory
      .filter((booking) => booking.status !== 'CANCELLED')
      .forEach((booking) => counts.set(booking.title, (counts.get(booking.title) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sin datos';
  }

  showClient(): void {
    this.view = 'client';
    window.history.replaceState({}, '', '/');
  }

  showLogin(): void {
    this.view = 'login';
    this.loginError = '';
    window.history.replaceState({}, '', '/login');
  }

  showAdmin(): void {
    if (!this.isAdminLoggedIn()) {
      this.showLogin();
      return;
    }
    this.view = 'admin';
    window.history.replaceState({}, '', '/admin');
  }

  login(): void {
    if (this.loginUser.trim() === 'admin' && this.loginPassword === 'admin') {
      localStorage.setItem(SESSION_KEY, 'true');
      this.loginPassword = '';
      this.loginError = '';
      this.showAdmin();
      return;
    }

    this.loginError = 'Credenciales incorrectas. Usa admin / admin para esta demo.';
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
    this.showClient();
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
      this.warning = 'Selecciona al menos una opcion para poder reservar.';
      this.confirmation = '';
      return;
    }

    if (this.isLesson && this.lessonBonuses < selectedCount) {
      this.warning = 'No tienes bonos suficientes. Compra mas bonos para poder reservar estas clases.';
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
      dateKey: this.toDateKey(this.selectedDate),
      hour: this.selectedHour,
      payment: this.isLesson
        ? `${selectedCount} bono${selectedCount === 1 ? '' : 's'}`
        : `${this.total.toFixed(2)} EUR`,
      customerName: this.customerName,
      phone: this.phone,
      amount: this.isLesson ? 0 : this.total,
      status: 'CONFIRMED'
    });

    this.reservationMessage = this.isLesson
      ? `Has reservado ${selectedCount} clase${selectedCount === 1 ? '' : 's'}. Te quedan ${this.lessonBonuses} bono${this.lessonBonuses === 1 ? '' : 's'}.`
      : `Has reservado ${selectedCount} ruta${selectedCount === 1 ? '' : 's'}.`;
    this.isReservationModalOpen = true;
    this.confirmation = '';
    this.warning = this.isLesson && this.lessonBonuses === 0
      ? 'Has agotado tus bonos. Compra mas bonos para reservar nuevas clases.'
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
    this.confirmation = `Has comprado ${pack.amount} bono${pack.amount === 1 ? '' : 's'} por ${pack.price} EUR. Ahora tienes ${this.lessonBonuses} bono${this.lessonBonuses === 1 ? '' : 's'} disponibles.`;
  }

  setAdminTab(tab: AdminTab): void {
    this.activeAdminTab = tab;
  }

  openExperienceModal(experience?: Experience): void {
    this.editingExperience = experience || null;
    this.experienceForm = experience ? { ...experience } : this.blankExperience();
    this.isExperienceModalOpen = true;
  }

  closeExperienceModal(): void {
    this.isExperienceModalOpen = false;
    this.editingExperience = null;
    this.experienceForm = this.blankExperience();
  }

  saveExperience(): void {
    const form = {
      ...this.experienceForm,
      price: Number(this.experienceForm.price)
    };

    if (this.editingExperience) {
      this.experiences = this.experiences.map((experience) => experience.id === this.editingExperience?.id ? form : experience);
    } else {
      this.experiences = [{ ...form, id: Date.now() }, ...this.experiences];
    }

    this.closeExperienceModal();
  }

  toggleExperience(experience: Experience): void {
    experience.active = !experience.active;
    this.selectedExperienceIds = this.selectedExperienceIds.filter((id) => id !== experience.id);
  }

  updateReservationStatus(id: number, status: ReservationStatus): void {
    this.bookingHistory = this.bookingHistory.map((booking) => booking.id === id ? { ...booking, status } : booking);
  }

  createAdminReservation(): void {
    const firstActive = this.experiences.find((experience) => experience.active);
    if (!firstActive) {
      return;
    }

    this.bookingHistory.unshift({
      id: Date.now(),
      type: firstActive.type,
      title: firstActive.title,
      date: this.formatDateFromKey(this.adminDate),
      dateKey: this.adminDate,
      hour: '11:30',
      payment: firstActive.type === 'lessons' ? '1 bono' : `${firstActive.price.toFixed(2)} EUR`,
      customerName: 'Reserva mostrador',
      phone: '600 000 000',
      amount: firstActive.type === 'lessons' ? 0 : firstActive.price,
      status: 'CONFIRMED'
    });
  }

  getTypeLabel(type: BookingType): string {
    return type === 'lessons' ? 'Clase' : 'Ruta';
  }

  getStatusLabel(status: ReservationStatus): string {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmada';
      case 'COMPLETED':
        return 'Completada';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status;
    }
  }

  private isAdminLoggedIn(): boolean {
    return localStorage.getItem(SESSION_KEY) === 'true';
  }

  private blankExperience(): Experience {
    return {
      id: 0,
      type: 'routes',
      title: '',
      description: '',
      level: 'Principiante',
      duration: '60 min',
      price: 45,
      image: 'assets/route-sendero.jpg',
      active: true
    };
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

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDateFromKey(dateKey: string): string {
    const date = new Date(`${dateKey}T00:00:00`);
    const weekday = LONG_WEEKDAYS[date.getDay()];
    return `${weekday}, ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  }
}
