import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type BookingType = 'routes' | 'lessons';
type AppView = 'client' | 'login' | 'admin';
type AdminTab = 'schedule' | 'experiences' | 'reservations' | 'users' | 'stats';
type ReservationStatus = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
type AuthMode = 'login' | 'register';

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

interface CustomerUser {
  id: number;
  name: string;
  phone: string;
  email: string;
  password: string;
  bonuses: number;
  createdAt: string;
}

interface BookingHistoryItem {
  id: number;
  userId: number | null;
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
const ADMIN_SESSION_KEY = 'centro_ecuestre_admin_session';
const CUSTOMER_SESSION_KEY = 'centro_ecuestre_customer_session';
const USERS_KEY = 'centro_ecuestre_users';
const BOOKINGS_KEY = 'centro_ecuestre_bookings';
const EXPERIENCES_KEY = 'centro_ecuestre_experiences';

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

  users: CustomerUser[] = this.loadFromStorage<CustomerUser[]>(USERS_KEY, []);
  experiences: Experience[] = this.loadFromStorage<Experience[]>(EXPERIENCES_KEY, this.defaultExperiences());
  bookingHistory: BookingHistoryItem[] = this.loadFromStorage<BookingHistoryItem[]>(BOOKINGS_KEY, []);

  view: AppView = this.getInitialView();
  activeType: BookingType = 'routes';
  activeAdminTab: AdminTab = 'schedule';
  authMode: AuthMode = 'login';
  selectedExperienceIds: number[] = [];
  visibleMonth = new Date(this.minDate.getFullYear(), this.minDate.getMonth(), 1);
  selectedDate = new Date(this.minDate);
  adminDate = this.toDateKey(this.minDate);
  selectedHour = '18:30';
  people = 1;
  currentUserId: number | null = this.getStoredCustomerId();
  isBonusModalOpen = false;
  isReservationModalOpen = false;
  isHistoryModalOpen = false;
  isExperienceModalOpen = false;
  reservationMessage = '';
  customerName = this.currentUser?.name || 'Paco Martinez';
  phone = this.currentUser?.phone || '633 443 322';
  confirmation = '';
  warning = '';
  loginUser = '';
  loginPassword = '';
  registerName = '';
  registerPhone = '';
  authError = '';
  reservationFilter: 'all' | ReservationStatus = 'all';
  editingExperience: Experience | null = null;
  experienceForm: Experience = this.blankExperience();

  get currentUser(): CustomerUser | null {
    return this.users.find((user) => user.id === this.currentUserId) || null;
  }

  get lessonBonuses(): number {
    return this.currentUser?.bonuses || 0;
  }

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
      ? 'Debes iniciar sesion para usar o comprar bonos'
      : 'Pago registrado en el momento - Confirmacion inmediata';
  }

  get canReserve(): boolean {
    return this.selectedExperiences.length > 0 && (!this.isLesson || (this.currentUser !== null && this.lessonBonuses >= this.selectedExperiences.length));
  }

  get visibleHistory(): BookingHistoryItem[] {
    if (!this.currentUser) {
      return [];
    }
    return this.bookingHistory.filter((booking) => booking.userId === this.currentUserId);
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

  get totalUserBonuses(): number {
    return this.users.reduce((sum, user) => sum + user.bonuses, 0);
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

  showLogin(mode: AuthMode = 'login'): void {
    this.view = 'login';
    this.authMode = mode;
    this.authError = '';
    window.history.replaceState({}, '', '/login');
  }

  showAdmin(): void {
    if (!this.isAdminLoggedIn()) {
      this.showLogin('login');
      return;
    }
    this.view = 'admin';
    window.history.replaceState({}, '', '/admin');
  }

  setAuthMode(mode: AuthMode): void {
    this.authMode = mode;
    this.authError = '';
  }

  login(): void {
    const email = this.loginUser.trim().toLowerCase();

    if (email === 'admin' && this.loginPassword === 'admin') {
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      this.loginPassword = '';
      this.authError = '';
      this.showAdmin();
      return;
    }

    const user = this.users.find((item) => item.email.toLowerCase() === email && item.password === this.loginPassword);
    if (!user) {
      this.authError = 'Credenciales incorrectas.';
      return;
    }

    this.setCurrentUser(user);
    this.loginPassword = '';
    this.authError = '';
    this.showClient();
  }

  register(): void {
    const email = this.loginUser.trim().toLowerCase();
    const password = this.loginPassword.trim();
    const name = this.registerName.trim();
    const phone = this.registerPhone.trim();

    if (!name || !phone || !email || !password) {
      this.authError = 'Completa nombre, telefono, email y contrasena.';
      return;
    }

    if (this.users.some((user) => user.email.toLowerCase() === email)) {
      this.authError = 'Ya existe un usuario con ese email.';
      return;
    }

    const user: CustomerUser = {
      id: Date.now(),
      name,
      phone,
      email,
      password,
      bonuses: 0,
      createdAt: new Date().toISOString()
    };

    this.users = [user, ...this.users];
    this.persistUsers();
    this.setCurrentUser(user);
    this.loginPassword = '';
    this.authError = '';
    this.showClient();
  }

  logout(): void {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    this.showClient();
  }

  logoutCustomer(): void {
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
    this.currentUserId = null;
    this.customerName = 'Paco Martinez';
    this.phone = '633 443 322';
    this.warning = '';
    this.confirmation = '';
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

    if (this.isLesson && !this.currentUser) {
      this.warning = 'Inicia sesion o crea una cuenta para reservar clases con bonos.';
      this.showLogin('login');
      return;
    }

    if (this.isLesson && this.lessonBonuses < selectedCount) {
      this.warning = 'No tienes bonos suficientes. Compra mas bonos para poder reservar estas clases.';
      this.confirmation = '';
      return;
    }

    if (this.isLesson) {
      this.updateCurrentUserBonuses(-selectedCount);
    }

    const customer = this.currentUser;
    const booking: BookingHistoryItem = {
      id: Date.now(),
      userId: customer?.id || null,
      type: this.activeType,
      title: this.selectedExperienceTitle,
      date: this.formattedDate,
      dateKey: this.toDateKey(this.selectedDate),
      hour: this.selectedHour,
      payment: this.isLesson
        ? `${selectedCount} bono${selectedCount === 1 ? '' : 's'}`
        : `${this.total.toFixed(2)} EUR`,
      customerName: customer?.name || this.customerName,
      phone: customer?.phone || this.phone,
      amount: this.isLesson ? 0 : this.total,
      status: 'CONFIRMED'
    };

    this.bookingHistory = [booking, ...this.bookingHistory];
    this.persistBookings();

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
    if (!this.currentUser) {
      this.warning = 'Para comprar bonos necesitas iniciar sesion o crear una cuenta.';
      this.showLogin('login');
      return;
    }

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
    if (!this.currentUser) {
      this.warning = 'Inicia sesion para ver tus reservas y bonos.';
      this.showLogin('login');
      return;
    }
    this.isHistoryModalOpen = true;
  }

  closeHistoryModal(): void {
    this.isHistoryModalOpen = false;
  }

  purchaseBonuses(pack: BonusPack): void {
    if (!this.currentUser) {
      this.closeBonusModal();
      this.showLogin('login');
      return;
    }

    this.updateCurrentUserBonuses(pack.amount);
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

    this.persistExperiences();
    this.closeExperienceModal();
  }

  toggleExperience(experience: Experience): void {
    experience.active = !experience.active;
    this.experiences = [...this.experiences];
    this.persistExperiences();
    this.selectedExperienceIds = this.selectedExperienceIds.filter((id) => id !== experience.id);
  }

  updateReservationStatus(id: number, status: ReservationStatus): void {
    this.bookingHistory = this.bookingHistory.map((booking) => booking.id === id ? { ...booking, status } : booking);
    this.persistBookings();
  }

  createAdminReservation(): void {
    const firstActive = this.experiences.find((experience) => experience.active);
    if (!firstActive) {
      return;
    }

    this.bookingHistory = [{
      id: Date.now(),
      userId: null,
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
    }, ...this.bookingHistory];
    this.persistBookings();
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

  getUserReservationsCount(userId: number): number {
    return this.bookingHistory.filter((booking) => booking.userId === userId).length;
  }

  adjustUserBonuses(userId: number, delta: number): void {
    this.users = this.users.map((user) => user.id === userId
      ? { ...user, bonuses: Math.max(0, user.bonuses + delta) }
      : user);
    this.persistUsers();
  }

  private setCurrentUser(user: CustomerUser): void {
    this.currentUserId = user.id;
    localStorage.setItem(CUSTOMER_SESSION_KEY, String(user.id));
    this.customerName = user.name;
    this.phone = user.phone;
  }

  private updateCurrentUserBonuses(delta: number): void {
    if (!this.currentUser) {
      return;
    }

    this.users = this.users.map((user) => user.id === this.currentUserId
      ? { ...user, bonuses: Math.max(0, user.bonuses + delta) }
      : user);
    this.persistUsers();
  }

  private isAdminLoggedIn(): boolean {
    return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  }

  private getStoredCustomerId(): number | null {
    const raw = localStorage.getItem(CUSTOMER_SESSION_KEY);
    const id = raw ? Number(raw) : null;
    return id && this.users.some((user) => user.id === id) ? id : null;
  }

  private getInitialView(): AppView {
    if (this.isAdminLoggedIn() && window.location.pathname.includes('admin')) {
      return 'admin';
    }
    return 'client';
  }

  private persistUsers(): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
  }

  private persistBookings(): void {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(this.bookingHistory));
  }

  private persistExperiences(): void {
    localStorage.setItem(EXPERIENCES_KEY, JSON.stringify(this.experiences));
  }

  private loadFromStorage<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : fallback;
    } catch {
      return fallback;
    }
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

  private defaultExperiences(): Experience[] {
    return [
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
