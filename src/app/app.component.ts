import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type BookingType = 'lessons';
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
  hours: string[];
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
const MAX_BOOKINGS_PER_SLOT = 5;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly navItems = ['Inicio', 'Clases de equitacion', 'Sobre nosotros', 'Contacto'];
  readonly weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  readonly hours = ['11:00', '18:00', '18:45', '19:30'];
  readonly bonusPacks: BonusPack[] = [
    { amount: 10, price: 160 }
  ];
  readonly minDate = this.startOfDay(new Date());
  readonly maxDate = this.addMonths(this.minDate, 3);

  users: CustomerUser[] = this.loadFromStorage<CustomerUser[]>(USERS_KEY, []);
  experiences: Experience[] = this.loadLessonExperiences();
  bookingHistory: BookingHistoryItem[] = this.loadActiveLessonBookings();

  view: AppView = this.getInitialView();
  activeAdminTab: AdminTab = 'schedule';
  authMode: AuthMode = 'login';
  selectedExperienceIds: number[] = [];
  visibleMonth = new Date(this.minDate.getFullYear(), this.minDate.getMonth(), 1);
  selectedDate = new Date(this.minDate);
  adminDate = this.toDateKey(this.minDate);
  selectedHour = '18:00';
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
  customExperienceHour = '';

  get currentUser(): CustomerUser | null {
    return this.users.find((user) => user.id === this.currentUserId) || null;
  }

  get lessonBonuses(): number {
    return this.currentUser?.bonuses || 0;
  }

  get filteredExperiences(): Experience[] {
    return this.experiences.filter((experience) => experience.active);
  }

  get selectedExperiences(): Experience[] {
    return this.filteredExperiences.filter((experience) => this.selectedExperienceIds.includes(experience.id));
  }

  get selectedExperienceTitle(): string {
    return this.selectedExperiences.map((experience) => experience.title).join(', ');
  }

  get availableHours(): string[] {
    if (this.selectedExperiences.length > 0) {
      return this.getExperienceHours(this.selectedExperiences[0]);
    }

    return this.sortHours([
      ...this.hours,
      ...this.filteredExperiences.flatMap((experience) => this.getExperienceHours(experience))
    ]);
  }

  get adminScheduleHours(): string[] {
    return this.sortHours([
      ...this.hours,
      ...this.experiences.flatMap((experience) => this.getExperienceHours(experience)),
      ...this.adminDayReservations.map((booking) => booking.hour)
    ]);
  }

  get editableExperienceHours(): string[] {
    return this.sortHours([...this.hours, ...this.getExperienceFormHours()]);
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
    return this.selectedExperiences.length === 1 ? 'Clase seleccionada' : 'Clase seleccionada (0)';
  }

  get actionLabel(): string {
    return 'Reservar con bono';
  }

  get actionHelpText(): string {
    return 'Debes iniciar sesion para usar o comprar bonos';
  }

  get canReserve(): boolean {
    return this.selectedExperiences.length > 0
      && this.currentUser !== null
      && this.lessonBonuses >= this.selectedExperiences.length
      && this.isSelectedHourAvailable
      && !this.hasCurrentUserBookedSelectedSlot
      && !this.isSelectedSlotFull
      && !this.isSelectedSlotPast;
  }

  get isSelectedHourAvailable(): boolean {
    return this.availableHours.includes(this.selectedHour);
  }

  get hasCurrentUserBookedSelectedSlot(): boolean {
    return this.hasCurrentUserBookedSlot(this.toDateKey(this.selectedDate), this.selectedHour);
  }

  get isSelectedSlotFull(): boolean {
    return this.isSlotFull(this.toDateKey(this.selectedDate), this.selectedHour);
  }

  get isSelectedSlotPast(): boolean {
    return this.isSlotPast(this.toDateKey(this.selectedDate), this.selectedHour);
  }

  get visibleHistory(): BookingHistoryItem[] {
    if (!this.currentUser) {
      return [];
    }
    return this.bookingHistory
      .filter((booking) => booking.userId === this.currentUserId && booking.status === 'CONFIRMED' && this.isBookingReminderActive(booking))
      .sort((first, second) => this.getBookingDateTime(first).getTime() - this.getBookingDateTime(second).getTime());
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

  get pendingLessonsToday(): number {
    return this.adminDayReservations.length;
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

  selectExperience(id: number): void {
    if (this.selectedExperienceIds.includes(id)) {
      this.selectedExperienceIds = [];
    } else {
      this.selectedExperienceIds = [id];
    }
    this.ensureSelectedHourAvailable();
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
    if (!this.availableHours.includes(hour) || this.isHourBooked(hour)) {
      return;
    }

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

    if (!this.currentUser) {
      this.warning = 'Inicia sesion o crea una cuenta para reservar clases con bonos.';
      this.showLogin('login');
      return;
    }

    if (this.lessonBonuses < selectedCount) {
      this.warning = 'No tienes bonos suficientes. Compra mas bonos para poder reservar estas clases.';
      this.confirmation = '';
      return;
    }

    if (!this.isSelectedHourAvailable) {
      this.warning = 'Esta clase no esta disponible en esa hora. Elige otra franja horaria.';
      this.confirmation = '';
      return;
    }

    if (this.isSelectedSlotPast) {
      this.warning = 'Esta hora ya ha pasado. Elige otra hora disponible.';
      this.confirmation = '';
      return;
    }

    if (this.hasCurrentUserBookedSelectedSlot) {
      this.warning = 'Ya tienes una reserva para esa hora y ese dia. Elige otra hora disponible.';
      this.confirmation = '';
      return;
    }

    if (this.isSelectedSlotFull) {
      this.warning = 'Esta hora ya tiene 5 reservas. Elige otra hora disponible.';
      this.confirmation = '';
      return;
    }

    this.updateCurrentUserBonuses(-selectedCount);

    const customer = this.currentUser;
    const booking: BookingHistoryItem = {
      id: Date.now(),
      userId: customer?.id || null,
      type: 'lessons',
      title: this.selectedExperienceTitle,
      date: this.formattedDate,
      dateKey: this.toDateKey(this.selectedDate),
      hour: this.selectedHour,
      payment: `${selectedCount} bono${selectedCount === 1 ? '' : 's'}`,
      customerName: customer?.name || this.customerName,
      phone: customer?.phone || this.phone,
      amount: 0,
      status: 'CONFIRMED'
    };

    this.bookingHistory = [booking, ...this.bookingHistory];
    this.persistBookings();

    this.reservationMessage = `Has reservado ${selectedCount} clase${selectedCount === 1 ? '' : 's'}. Te quedan ${this.lessonBonuses} bono${this.lessonBonuses === 1 ? '' : 's'}.`;
    this.isReservationModalOpen = true;
    this.confirmation = '';
    this.warning = this.lessonBonuses === 0
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
    this.removeExpiredBookings();
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
    this.experienceForm = experience ? { ...experience, hours: this.getExperienceHours(experience) } : this.blankExperience();
    this.isExperienceModalOpen = true;
  }

  closeExperienceModal(): void {
    this.isExperienceModalOpen = false;
    this.editingExperience = null;
    this.experienceForm = this.blankExperience();
    this.customExperienceHour = '';
  }

  saveExperience(): void {
    const form = {
      ...this.experienceForm,
      type: 'lessons' as BookingType,
      price: Number(this.experienceForm.price),
      hours: this.sanitizeExperienceHours(this.experienceForm.hours)
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
    const reservationOption = this.experiences
      .filter((experience) => experience.active)
      .map((experience) => ({
        experience,
        hour: this.getExperienceHours(experience).find((hour) => !this.isSlotFull(this.adminDate, hour) && !this.isSlotPast(this.adminDate, hour))
      }))
      .find((option) => option.hour);

    if (!reservationOption || !reservationOption.hour) {
      return;
    }

    this.bookingHistory = [{
      id: Date.now(),
      userId: null,
      type: reservationOption.experience.type,
      title: reservationOption.experience.title,
      date: this.formatDateFromKey(this.adminDate),
      dateKey: this.adminDate,
      hour: reservationOption.hour,
      payment: '1 bono',
      customerName: 'Reserva mostrador',
      phone: '600 000 000',
      amount: 0,
      status: 'CONFIRMED'
    }, ...this.bookingHistory];
    this.persistBookings();
  }

  getTypeLabel(type: BookingType): string {
    return 'Clase';
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

  private loadLessonExperiences(): Experience[] {
    return this.loadFromStorage<Experience[]>(EXPERIENCES_KEY, this.defaultExperiences())
      .filter((experience) => experience.type === 'lessons')
      .map((experience) => ({
        ...experience,
        hours: this.getExperienceHours(experience)
      }));
  }

  private loadActiveLessonBookings(): BookingHistoryItem[] {
    return this.loadFromStorage<BookingHistoryItem[]>(BOOKINGS_KEY, [])
      .filter((booking) => booking.type === 'lessons' && this.isBookingReminderActive(booking));
  }

  private removeExpiredBookings(): void {
    const activeBookings = this.bookingHistory.filter((booking) => this.isBookingReminderActive(booking));
    if (activeBookings.length === this.bookingHistory.length) {
      return;
    }

    this.bookingHistory = activeBookings;
    this.persistBookings();
  }

  private isBookingReminderActive(booking: BookingHistoryItem): boolean {
    const reminderLimit = this.addHours(this.getBookingDateTime(booking), 1);
    return reminderLimit > new Date();
  }

  private getBookingDateTime(booking: BookingHistoryItem): Date {
    return new Date(`${booking.dateKey}T${booking.hour}:00`);
  }

  isHourBooked(hour: string): boolean {
    const dateKey = this.toDateKey(this.selectedDate);
    return this.isSlotFull(dateKey, hour) || this.isSlotPast(dateKey, hour);
  }

  toggleExperienceHour(hour: string): void {
    const currentHours = this.getExperienceFormHours();
    if (currentHours.includes(hour) && currentHours.length === 1) {
      return;
    }

    this.experienceForm = {
      ...this.experienceForm,
      hours: currentHours.includes(hour)
        ? currentHours.filter((selectedHour) => selectedHour !== hour)
        : [...currentHours, hour]
    };
  }

  isExperienceHourSelected(hour: string): boolean {
    return this.getExperienceFormHours().includes(hour);
  }

  addCustomExperienceHour(): void {
    const hour = this.customExperienceHour.trim();
    if (!this.isValidHour(hour)) {
      return;
    }

    this.experienceForm = {
      ...this.experienceForm,
      hours: this.sortHours([...this.getExperienceFormHours(), hour])
    };
    this.customExperienceHour = '';
  }

  private hasCurrentUserBookedSlot(dateKey: string, hour: string): boolean {
    if (!this.currentUserId) {
      return false;
    }

    return this.bookingHistory.some((booking) =>
      booking.dateKey === dateKey
      && booking.hour === hour
      && booking.userId === this.currentUserId
      && booking.status !== 'CANCELLED'
      && this.isBookingReminderActive(booking)
    );
  }

  private isSlotFull(dateKey: string, hour: string): boolean {
    return this.getSlotBookingsCount(dateKey, hour) >= MAX_BOOKINGS_PER_SLOT;
  }

  private getSlotBookingsCount(dateKey: string, hour: string): number {
    return this.bookingHistory.filter((booking) =>
      booking.dateKey === dateKey
      && booking.hour === hour
      && booking.status !== 'CANCELLED'
      && this.isBookingReminderActive(booking)
    ).length;
  }

  private isSlotPast(dateKey: string, hour: string): boolean {
    return new Date(`${dateKey}T${hour}:00`) <= new Date();
  }

  private ensureSelectedHourAvailable(): void {
    if (this.availableHours.includes(this.selectedHour)) {
      return;
    }

    this.selectedHour = this.availableHours[0] || this.hours[0];
  }

  private getExperienceHours(experience: Experience): string[] {
    return this.sanitizeExperienceHours(experience.hours);
  }

  private sanitizeExperienceHours(hours?: string[]): string[] {
    const validHours = this.sortHours([...(hours || [])].filter((hour) => this.isValidHour(hour)));
    return validHours.length > 0 ? validHours : [...this.hours];
  }

  private getExperienceFormHours(): string[] {
    return this.sortHours((this.experienceForm.hours || []).filter((hour) => this.isValidHour(hour)));
  }

  private isValidHour(hour: string): boolean {
    if (!/^\d{2}:\d{2}$/.test(hour)) {
      return false;
    }

    const [rawHour, rawMinute] = hour.split(':').map(Number);
    return rawHour >= 0 && rawHour <= 23 && rawMinute >= 0 && rawMinute <= 59;
  }

  private sortHours(hours: string[]): string[] {
    return [...new Set(hours)]
      .filter((hour) => this.isValidHour(hour))
      .sort((first, second) => this.getHourMinutes(first) - this.getHourMinutes(second));
  }

  private getHourMinutes(hour: string): number {
    const [rawHour, rawMinute] = hour.split(':').map(Number);
    return rawHour * 60 + rawMinute;
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
      type: 'lessons',
      title: '',
      description: '',
      level: 'Principiante',
      duration: '60 min',
      price: 45,
      image: 'assets/route-sendero.jpg',
      active: true,
      hours: [...this.hours]
    };
  }

  private defaultExperiences(): Experience[] {
    return [
      {
        id: 1,
        type: 'lessons',
        title: 'Clase de Iniciacion',
        description: 'Sesion guiada en pista para aprender postura, control basico y seguridad desde cero.',
        level: 'Principiante',
        duration: '60 min',
        price: 38,
        image: 'assets/route-sendero.jpg',
        active: true,
        hours: ['11:00', '18:00', '18:45', '19:30']
      },
      {
        id: 2,
        type: 'lessons',
        title: 'Clase Tecnica Privada',
        description: 'Trabajo personalizado para mejorar ayudas, asiento y confianza con seguimiento individual.',
        level: 'Intermedio',
        duration: '75 min',
        price: 55,
        image: 'assets/route-crepusculo.jpg',
        active: true,
        hours: ['11:00', '18:00', '18:45', '19:30']
      }
    ];
  }

  private addMonths(date: Date, months: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  }

  private addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
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
