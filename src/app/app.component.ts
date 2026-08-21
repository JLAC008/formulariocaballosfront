import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type BookingType = 'lessons' | 'routes';
type AppView = 'client' | 'login' | 'admin';
type AdminTab = 'schedule' | 'experiences' | 'reservations' | 'users' | 'stats';
type ReservationStatus = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
type AuthMode = 'login' | 'register' | 'forgot' | 'reset';
type UserRole = 'guest' | 'customer' | 'admin';

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
  hourMessages?: Record<string, string>;
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

interface BonusPaymentStatusResponse {
  status: 'PENDING' | 'COMPLETED';
  bonuses: number;
  user: CustomerUser;
}

interface ExperienceTypeOption {
  value: BookingType;
  label: string;
}

interface CustomerUser {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email: string;
  password?: string;
  role?: string;
  bonuses: number;
  emailVerified?: boolean;
  active?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface BookingHistoryItem {
  id: number;
  userId: number | null;
  experienceId?: number;
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

interface AdminScheduleGroup {
  key: string;
  title: string;
  hour: string;
  bookings: BookingHistoryItem[];
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
import { environment } from '../environments/environment';

const CUSTOMER_SESSION_KEY = 'centro_ecuestre_customer_session';
const USERS_KEY = 'centro_ecuestre_users';
const BOOKINGS_KEY = 'centro_ecuestre_bookings';
const EXPERIENCES_KEY = 'centro_ecuestre_experiences';
const LESSON_CAPACITY = 5;
const ROUTE_CAPACITY = 8;
const API_URL = environment.apiUrl;
const API_BASE_URL = API_URL.replace(/\/api\/?$/, '');
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SPANISH_PHONE_PATTERN = /^(?:\+34\s?)?[6789]\d{8}$/;
const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+(?:[ '\-][A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+)*$/;
const PASSWORD_PATTERN = /^(?=.*[a-záéíóúüñ])(?=.*[A-ZÁÉÍÓÚÜÑ])(?=.*\d).{8,}$/;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly navItems = [
    { label: 'Nuestra escuela', url: 'https://martinezluna.es/nuestra-escuela/' },
    { label: 'Consultoría', url: 'https://martinezluna.es/reservar-cita/' },
    { label: 'Curso', url: 'https://martinezluna.es/curso-doma-de-iniciacion/' },
    { label: 'Sobre mi', url: 'https://martinezluna.es/our-story/' },
    { label: 'Tienda', url: 'https://martinezluna.es/tienda/' },
    { label: 'Contacto', url: 'https://martinezluna.es/contact/' }
  ];
  readonly weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  readonly hours = ['11:00', '18:00', '18:45', '19:30'];
  readonly bonusPacks: BonusPack[] = [
    { amount: 10, price: 160 }
  ];
  readonly experienceTypes: ExperienceTypeOption[] = [
    { value: 'lessons', label: 'Clase' },
    { value: 'routes', label: 'Ruta' }
  ];
  readonly minDate = this.startOfDay(new Date());
  readonly maxDate = this.addMonths(this.minDate, 3);

  users: CustomerUser[] = this.loadFromStorage<CustomerUser[]>(USERS_KEY, []).map((user) => this.toCustomerUser(user));
  experiences: Experience[] = this.loadLessonExperiences();
  bookingHistory: BookingHistoryItem[] = this.loadActiveLessonBookings();

  view: AppView = this.getInitialView();
  activeAdminTab: AdminTab = 'schedule';
  authMode: AuthMode = 'login';
  activeExperienceType: BookingType = 'lessons';
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
  isDeleteExperienceModalOpen = false;
  isCancelClassModalOpen = false;
  isAccountMenuOpen = false;
  reservationMessage = '';
  reservationNoticeMessage = '';
  customerName = this.currentUser?.name || 'Paco Martinez';
  phone = this.currentUser?.phone || '633 443 322';
  confirmation = '';
  warning = '';
  loginUser = '';
  loginPassword = '';
  resetToken = '';
  resetPassword = '';
  resetPasswordConfirm = '';
  registerName = '';
  registerLastName = '';
  registerPhone = '';
  authError = '';
  authNotice = '';
  verificationEmailSentTo = '';
  reservationFilter: 'all' | ReservationStatus = 'all';
  editingExperience: Experience | null = null;
  deletingExperience: Experience | null = null;
  cancellingScheduleGroup: AdminScheduleGroup | null = null;
  experienceForm: Experience = this.blankExperience();
  customExperienceHour = '';
  customExperienceHourError = '';
  imageUploadError = '';
  imageUploadInProgress = false;
  isBonusCheckoutInProgress = false;
  userBonusAdjustments: Record<number, number> = {};

  constructor() {
    void this.handleAuthLinks();
    void this.loadRemoteExperiences();
    void this.handleStripeBonusReturn();
  }

  get currentUser(): CustomerUser | null {
    return this.users.find((user) => user.id === this.currentUserId) || null;
  }

  get currentRole(): UserRole {
    if (this.isAdminLoggedIn()) {
      return 'admin';
    }

    return this.currentUser ? 'customer' : 'guest';
  }

  get isGuest(): boolean {
    return this.currentRole === 'guest';
  }

  get isCustomer(): boolean {
    return this.currentRole === 'customer';
  }

  get isAdmin(): boolean {
    return this.currentRole === 'admin';
  }

  get lessonBonuses(): number {
    return this.currentUser?.bonuses || 0;
  }

  get filteredExperiences(): Experience[] {
    return this.experiences.filter((experience) => experience.active && experience.type === this.activeExperienceType);
  }

  get selectedExperiences(): Experience[] {
    return this.filteredExperiences.filter((experience) => this.selectedExperienceIds.includes(experience.id));
  }

  get selectedExperienceTitle(): string {
    return this.selectedExperiences.map((experience) => experience.title).join(', ');
  }

  get selectedExperience(): Experience | null {
    return this.selectedExperiences[0] || null;
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

  get editableExperienceSelectedHours(): string[] {
    return this.getExperienceFormHours();
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
    return this.selectedExperiences.length === 1
      ? `${this.getTypeLabel(this.selectedExperiences[0].type)} seleccionada`
      : 'Experiencia seleccionada (0)';
  }

  get actionLabel(): string {
    return 'Reservar con bono';
  }

  get actionHelpText(): string {
    return 'Debes iniciar sesión para usar o comprar bonos';
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
    return this.selectedExperience
      ? this.hasCurrentUserBookedSlot(this.toDateKey(this.selectedDate), this.selectedHour)
      : false;
  }

  get isSelectedSlotFull(): boolean {
    return this.selectedExperience
      ? this.isSlotFull(this.selectedExperience, this.toDateKey(this.selectedDate), this.selectedHour)
      : false;
  }

  get isSelectedSlotPast(): boolean {
    return this.isSlotPast(this.toDateKey(this.selectedDate), this.selectedHour);
  }

  get visibleHistory(): BookingHistoryItem[] {
    if (!this.currentUser) {
      return [];
    }
    return this.bookingHistory
      .filter((booking) =>
        booking.userId === this.currentUserId
        && (booking.status === 'CONFIRMED' || booking.status === 'CANCELLED')
        && this.isBookingReminderActive(booking)
      )
      .sort((first, second) => this.getBookingDateTime(second).getTime() - this.getBookingDateTime(first).getTime());
  }

  get adminDayReservations(): BookingHistoryItem[] {
    return this.bookingHistory.filter((booking) => booking.dateKey === this.adminDate);
  }

  getAdminReservationsByHour(hour: string): BookingHistoryItem[] {
    return this.adminDayReservations.filter((booking) => booking.hour === hour);
  }

  getAdminConfirmedReservationsByHour(hour: string): BookingHistoryItem[] {
    return this.getAdminReservationsByHour(hour).filter((booking) => booking.status === 'CONFIRMED');
  }

  getAdminScheduleGroupsByHour(hour: string): AdminScheduleGroup[] {
    const groups = new Map<string, AdminScheduleGroup>();

    this.getAdminReservationsByHour(hour).forEach((booking) => {
      const key = this.getBookingClassKey(booking);
      const existingGroup = groups.get(key);

      if (existingGroup) {
        existingGroup.bookings = [...existingGroup.bookings, booking];
        return;
      }

      groups.set(key, {
        key,
        title: booking.title,
        hour,
        bookings: [booking]
      });
    });

    return [...groups.values()].sort((first, second) => first.title.localeCompare(second.title));
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
    return this.adminDayReservations.filter((booking) => booking.status === 'CONFIRMED').length;
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

  get deletingExperienceReservationsCount(): number {
    return this.deletingExperience ? this.getExperienceReservationsCount(this.deletingExperience) : 0;
  }

  get deletingExperienceRefundBonusesCount(): number {
    return this.deletingExperience
      ? this.getDeletableExperienceBookings(this.deletingExperience).reduce((sum, booking) => sum + this.getBookingBonusAmount(booking), 0)
      : 0;
  }

  get cancellingClassReservationsCount(): number {
    return this.getCancellableScheduleGroupBookings().length;
  }

  get cancellingClassRefundBonusesCount(): number {
    return this.getCancellableScheduleGroupBookings().reduce((sum, booking) => sum + this.getBookingBonusAmount(booking), 0);
  }

  showClient(): void {
    this.view = 'client';
    this.closeAccountMenu();
    window.history.replaceState({}, '', '/');
  }

  showLogin(mode: AuthMode = 'login'): void {
    this.view = 'login';
    this.authMode = mode;
    this.authError = '';
    this.authNotice = '';
    this.closeAccountMenu();
    if (mode !== 'reset') {
      window.history.replaceState({}, '', '/login');
    }
  }

  showAdmin(): void {
    if (!this.isAdminLoggedIn()) {
      this.showLogin('login');
      return;
    }
    this.view = 'admin';
    this.closeAccountMenu();
    window.history.replaceState({}, '', '/admin');
  }

  setAuthMode(mode: AuthMode): void {
    this.authMode = mode;
    this.authError = '';
    this.authNotice = '';
    if (mode !== 'register') {
      this.verificationEmailSentTo = '';
    }
  }

  setExperienceType(type: BookingType): void {
    if (this.activeExperienceType === type) {
      return;
    }

    this.activeExperienceType = type;
    this.selectedExperienceIds = [];
    this.ensureSelectedHourAvailable();
    this.confirmation = '';
    this.warning = '';
  }

  async login(): Promise<void> {
    const email = this.loginUser.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(email) || !this.loginPassword) {
      this.authError = 'Introduce un email y una contraseña válidos.';
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: this.loginPassword })
      });
      if (!response.ok) {
        this.authError = 'Credenciales incorrectas o cuenta sin verificar.';
        return;
      }
      const auth = await response.json();
      localStorage.setItem('centro_ecuestre_token', auth.token);
      if (auth.role === 'ADMIN') {
        localStorage.setItem(ADMIN_SESSION_KEY, 'true');
        this.currentUserId = null;
        this.showAdmin();
        await this.loadRemoteAdminState();
      } else if (auth.user) {
        const user = this.toCustomerUser(auth.user);
        this.users = [user, ...this.users.filter((item) => item.id !== user.id)];
        this.setCurrentUser(user);
        await this.loadRemoteUserBookings();
        this.showClient();
      }
      this.loginPassword = '';
      this.authError = '';
    } catch {
      this.authError = 'No se pudo conectar con el servidor.';
    }
  }

  async requestPasswordReset(): Promise<void> {
    const email = this.loginUser.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(email)) {
      this.authError = 'Introduce un email válido.';
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        this.authError = error?.error || 'No existe ningun usuario con ese email.';
        return;
      }
      this.authError = '';
      this.authNotice = 'Te hemos enviado un enlace para cambiar la contraseña.';
    } catch {
      this.authError = 'No se pudo conectar con el servidor.';
    }
  }

  async resendVerification(): Promise<void> {
    const email = (this.verificationEmailSentTo || this.loginUser).trim().toLowerCase();

    if (!EMAIL_PATTERN.test(email)) {
      this.authError = 'Introduce el email de la cuenta pendiente.';
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
        this.authError = 'No se pudo reenviar el correo de verificación.';
        return;
      }
      this.authError = '';
      this.authNotice = 'Te hemos enviado otro enlace de verificación.';
    } catch {
      this.authError = 'No se pudo conectar con el servidor.';
    }
  }

  async submitPasswordReset(): Promise<void> {
    if (!this.resetToken) {
      this.authError = 'El enlace de recuperación no es válido.';
      return;
    }
    if (!PASSWORD_PATTERN.test(this.resetPassword)) {
      this.authError = 'La contraseña debe tener 8 caracteres, mayúscula, minúscula y número.';
      return;
    }
    if (this.resetPassword !== this.resetPasswordConfirm) {
      this.authError = 'Las contraseñas no coinciden.';
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.resetToken, password: this.resetPassword })
      });
      if (!response.ok) {
        this.authError = 'El enlace no es válido o ha caducado.';
        return;
      }
      this.resetToken = '';
      this.resetPassword = '';
      this.resetPasswordConfirm = '';
      this.authMode = 'login';
      this.authError = '';
      this.authNotice = 'Contraseña actualizada. Ya puedes iniciar sesión.';
      window.history.replaceState({}, '', '/login');
    } catch {
      this.authError = 'No se pudo conectar con el servidor.';
    }
  }

  private async loadRemoteExperiences(): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/experiences`);
      if (!response.ok) return;
      const remote = await response.json();
      if (Array.isArray(remote) && remote.length > 0) {
        this.experiences = remote.map((item: any) => this.toExperience(item));
      }
    } catch {
      // The local catalogue remains available when the API is offline.
    }
  }

  private async loadRemoteUserBookings(): Promise<void> {
    const token = localStorage.getItem('centro_ecuestre_token');
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/bookings/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const remote = await response.json();
      if (Array.isArray(remote)) this.bookingHistory = remote.map((item: any) => this.toBookingHistoryItem(item));
    } catch {
      // Keep the cached list as a temporary fallback.
    }
  }

  private async handleStripeBonusReturn(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('stripe_bonus');
    const sessionId = params.get('session_id');
    if (!result) {
      return;
    }

    window.history.replaceState({}, document.title, window.location.pathname || '/');

    if (result === 'cancel') {
      this.warning = 'Pago cancelado. No se han añadido bonos.';
      return;
    }

    const token = localStorage.getItem('centro_ecuestre_token');
    if (!token || !sessionId) {
      this.warning = 'No se pudo confirmar el pago. Inicia sesión y revisa tus bonos.';
      return;
    }

    try {
      const response = await fetch(`${API_URL}/payments/bonuses/status?sessionId=${encodeURIComponent(sessionId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        this.warning = 'No se pudo confirmar el pago con Stripe.';
        return;
      }

      const payment: BonusPaymentStatusResponse = await response.json();
      if (payment.user) {
        this.upsertCurrentUser(payment.user);
      }
      if (payment.status === 'COMPLETED') {
        this.confirmation = `Pago confirmado. Se han añadido ${payment.bonuses} bono${payment.bonuses === 1 ? '' : 's'} a tu cuenta.`;
        this.warning = '';
      } else {
        this.warning = 'El pago todavía no aparece como completado. Vuelve a intentarlo en unos segundos.';
      }
    } catch {
      this.warning = 'No se pudo confirmar el pago con Stripe.';
    }
  }

  private async loadRemoteAdminState(): Promise<void> {
    const token = localStorage.getItem('centro_ecuestre_token');
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/state`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const state = await response.json();
      if (Array.isArray(state.users)) this.users = state.users.map((item: any) => this.toCustomerUser(item));
      if (Array.isArray(state.experiences)) this.experiences = state.experiences.map((item: any) => this.toExperience(item));
      if (Array.isArray(state.bookingHistory)) this.bookingHistory = state.bookingHistory.map((item: any) => this.toBookingHistoryItem(item));
    } catch {
      // Keep cached admin data as a temporary fallback.
    }
  }

  private toBookingHistoryItem(item: any): BookingHistoryItem {
    return {
      id: item.id,
      userId: item.userId ?? null,
      experienceId: item.experienceId,
      type: this.toBookingType(item.type),
      title: item.title || 'Clase',
      date: item.date || item.dateKey,
      dateKey: item.dateKey,
      hour: item.hour,
      payment: item.payment || 'mock',
      customerName: item.customerName || this.customerName,
      phone: item.phone || this.phone,
      amount: Number(item.amount || 0),
      status: item.status || 'CONFIRMED'
    };
  }

  async register(): Promise<void> {
    const email = this.loginUser.trim().toLowerCase();
    const password = this.loginPassword;
    const firstName = this.registerName.trim().replace(/\s+/g, ' ');
    const lastName = this.registerLastName.trim().replace(/\s+/g, ' ');
    const phone = this.registerPhone.trim().replace(/[\s-]/g, '');

    if (!NAME_PATTERN.test(firstName) || firstName.length < 2 || firstName.length > 80) {
      this.authError = 'Introduce un nombre válido.';
      return;
    }
    if (!NAME_PATTERN.test(lastName) || lastName.length < 2 || lastName.length > 80) {
      this.authError = 'Introduce unos apellidos válidos.';
      return;
    }
    if (!EMAIL_PATTERN.test(email) || email.length > 180) {
      this.authError = 'Introduce un email válido.';
      return;
    }
    if (!SPANISH_PHONE_PATTERN.test(phone)) {
      this.authError = 'Introduce un teléfono español válido.';
      return;
    }
    if (!PASSWORD_PATTERN.test(password)) {
      this.authError = 'La contraseña debe tener 8 caracteres, mayúscula, minúscula y número.';
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone: phone.startsWith('+34') ? phone : `+34${phone}`, email, password })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        this.authError = error?.error || 'No se pudo crear la cuenta.';
        return;
      }
      this.authError = '';
      this.authNotice = 'Cuenta creada. Revisa tu email para confirmar el registro.';
      this.verificationEmailSentTo = email;
      this.loginPassword = '';
    } catch {
      this.authError = 'No se pudo conectar con el servidor.';
    }
  }

  logout(): void {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    this.closeAccountMenu();
    this.showClient();
  }

  logoutCurrentSession(): void {
    if (this.isAdmin) {
      this.logout();
      return;
    }

    this.logoutCustomer();
  }

  logoutCustomer(): void {
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
    this.currentUserId = null;
    this.customerName = 'Paco Martinez';
    this.phone = '633 443 322';
    this.warning = '';
    this.confirmation = '';
    this.closeAccountMenu();
  }

  toggleAccountMenu(): void {
    this.isAccountMenuOpen = !this.isAccountMenuOpen;
  }

  closeAccountMenu(): void {
    this.isAccountMenuOpen = false;
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

  async reserve(): Promise<void> {
    const selectedCount = this.selectedExperiences.length;

    if (selectedCount === 0) {
      this.warning = 'Selecciona al menos una opción para poder reservar.';
      this.confirmation = '';
      return;
    }

    if (!this.currentUser) {
      this.warning = 'Inicia sesión o crea una cuenta para reservar experiencias con bonos.';
      this.showLogin('login');
      return;
    }

    if (this.lessonBonuses < selectedCount) {
      this.warning = 'No tienes bonos suficientes. Compra mas bonos para poder reservar estas experiencias.';
      this.confirmation = '';
      return;
    }

    if (!this.isSelectedHourAvailable) {
      this.warning = 'Esta experiencia no esta disponible en esa hora. Elige otra franja horaria.';
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
      this.warning = 'Esta hora ya tiene el aforo completo. Elige otra hora disponible.';
      this.confirmation = '';
      return;
    }

    const customer = this.currentUser;
    const token = localStorage.getItem('centro_ecuestre_token');
    const response = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        experienceId: this.selectedExperience?.id,
        dateKey: this.toDateKey(this.selectedDate),
        date: this.formattedDate,
        hour: this.selectedHour,
        payment: 'mock',
        customerName: customer?.name || this.customerName,
        phone: customer?.phone || this.phone
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      this.warning = error?.error || 'No se pudo crear la reserva.';
      this.confirmation = '';
      return;
    }

    const saved = await response.json();
    const booking: BookingHistoryItem = {
      id: saved.id,
      userId: saved.userId ?? customer?.id ?? null,
      experienceId: saved.experienceId,
      type: this.toBookingType(saved.type || this.selectedExperience?.type),
      title: saved.title || this.selectedExperienceTitle,
      date: this.formattedDate,
      dateKey: saved.dateKey || this.toDateKey(this.selectedDate),
      hour: saved.hour || this.selectedHour,
      payment: 'mock',
      customerName: customer?.name || this.customerName,
      phone: customer?.phone || this.phone,
      amount: Number(saved.amount || 0),
      status: saved.status || 'CONFIRMED'
    };

    this.bookingHistory = [booking, ...this.bookingHistory];
    this.persistBookings();
    if (typeof saved.remainingBonuses === 'number' && customer) {
      this.setCurrentUserBonuses(saved.remainingBonuses);
    }

    this.reservationMessage = `Has reservado ${selectedCount} experiencia${selectedCount === 1 ? '' : 's'}. Te quedan ${this.lessonBonuses} bono${this.lessonBonuses === 1 ? '' : 's'}.`;
    this.reservationNoticeMessage = this.getSelectedHourMessage();
    this.isReservationModalOpen = true;
    this.confirmation = '';
    this.warning = this.lessonBonuses === 0
      ? 'Has agotado tus bonos. Compra mas bonos para reservar nuevas experiencias.'
      : '';
  }

  openBonusModal(): void {
    if (!this.currentUser) {
      this.warning = 'Para comprar bonos necesitas iniciar sesión o crear una cuenta.';
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
    this.reservationNoticeMessage = '';
  }

  openHistoryModal(): void {
    if (!this.currentUser) {
      this.warning = 'Inicia sesión para ver tus reservas y bonos.';
      this.showLogin('login');
      return;
    }
    this.removeExpiredBookings();
    this.closeAccountMenu();
    this.isHistoryModalOpen = true;
  }

  closeHistoryModal(): void {
    this.isHistoryModalOpen = false;
  }

  async purchaseBonuses(pack: BonusPack): Promise<void> {
    if (!this.currentUser) {
      this.closeBonusModal();
      this.showLogin('login');
      return;
    }

    const token = localStorage.getItem('centro_ecuestre_token');
    if (!token) {
      this.closeBonusModal();
      this.showLogin('login');
      return;
    }

    this.isBonusCheckoutInProgress = true;
    this.warning = '';
    this.confirmation = '';

    try {
      const response = await fetch(`${API_URL}/payments/bonuses/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: pack.amount })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        this.warning = error?.error || 'No se pudo iniciar el pago con Stripe.';
        this.isBonusCheckoutInProgress = false;
        return;
      }

      const checkout = await response.json();
      if (!checkout.url) {
        this.warning = 'Stripe no devolvió una página de pago.';
        this.isBonusCheckoutInProgress = false;
        return;
      }

      window.location.href = checkout.url;
    } catch {
      this.warning = 'No se pudo conectar con Stripe.';
      this.isBonusCheckoutInProgress = false;
    }
  }

  setAdminTab(tab: AdminTab): void {
    this.activeAdminTab = tab;
  }

  openExperienceModal(experience?: Experience): void {
    this.editingExperience = experience || null;
    this.imageUploadError = '';
    this.imageUploadInProgress = false;
    this.experienceForm = experience
      ? {
          ...experience,
          hours: this.getExperienceHours(experience),
          hourMessages: this.sanitizeHourMessages(experience.hourMessages, this.getExperienceHours(experience))
        }
      : this.blankExperience();
    this.isExperienceModalOpen = true;
  }

  closeExperienceModal(): void {
    this.isExperienceModalOpen = false;
    this.editingExperience = null;
    this.experienceForm = this.blankExperience();
    this.customExperienceHour = '';
    this.customExperienceHourError = '';
    this.imageUploadError = '';
    this.imageUploadInProgress = false;
  }

  async uploadExperienceImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const token = localStorage.getItem('centro_ecuestre_token');
    if (!token) {
      this.imageUploadError = 'Inicia sesión como administrador para subir imágenes.';
      input.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    this.imageUploadError = '';
    this.imageUploadInProgress = true;

    try {
      const response = await fetch(`${API_URL}/uploads/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        this.imageUploadError = error?.error || 'No se pudo subir la imagen.';
        return;
      }

      const uploaded = await response.json();
      this.experienceForm = {
        ...this.experienceForm,
        image: uploaded.url || this.experienceForm.image
      };
    } catch {
      this.imageUploadError = 'No se pudo conectar con el servidor para subir la imagen.';
    } finally {
      this.imageUploadInProgress = false;
      input.value = '';
    }
  }

  saveExperience(): void {
    const form = {
      ...this.experienceForm,
      type: this.toBookingType(this.experienceForm.type),
      price: Number(this.experienceForm.price),
      hours: this.sanitizeExperienceHours(this.experienceForm.hours),
      hourMessages: this.sanitizeHourMessages(this.experienceForm.hourMessages, this.experienceForm.hours)
    };

    if (this.editingExperience) {
      this.experiences = this.experiences.map((experience) => experience.id === this.editingExperience?.id ? form : experience);
    } else {
      this.experiences = [{ ...form, id: Date.now() }, ...this.experiences];
    }

    this.persistExperiences();
    void this.syncAdminState();
    this.closeExperienceModal();
  }

  toggleExperience(experience: Experience): void {
    experience.active = !experience.active;
    this.experiences = [...this.experiences];
    this.persistExperiences();
    void this.syncAdminState();
    this.selectedExperienceIds = this.selectedExperienceIds.filter((id) => id !== experience.id);
  }

  openDeleteExperienceModal(experience: Experience): void {
    this.deletingExperience = experience;
    this.isDeleteExperienceModalOpen = true;
  }

  closeDeleteExperienceModal(): void {
    this.deletingExperience = null;
    this.isDeleteExperienceModalOpen = false;
  }

  confirmDeleteExperience(): void {
    if (!this.deletingExperience) {
      return;
    }

    const experienceId = this.deletingExperience.id;
    const deletingExperience = this.deletingExperience;
    const bookingsToRefund = this.getDeletableExperienceBookings(this.deletingExperience);
    const refunds = new Map<number, number>();

    bookingsToRefund.forEach((booking) => {
      if (!booking.userId) {
        return;
      }

      refunds.set(booking.userId, (refunds.get(booking.userId) || 0) + this.getBookingBonusAmount(booking));
    });

    this.users = this.users.map((user) => ({
      ...user,
      bonuses: user.bonuses + (refunds.get(user.id) || 0)
    }));
    this.bookingHistory = this.bookingHistory.map((booking) => this.isBookingForExperience(booking, deletingExperience) && booking.status === 'CONFIRMED'
      ? { ...booking, status: 'CANCELLED' }
      : booking);
    this.experiences = this.experiences.filter((item) => item.id !== experienceId);
    this.selectedExperienceIds = this.selectedExperienceIds.filter((id) => id !== experienceId);
    this.persistUsers();
    this.persistBookings();
    this.persistExperiences();
    void this.syncAdminState();
    this.closeDeleteExperienceModal();
  }

  openCancelClassModal(group: AdminScheduleGroup): void {
    this.cancellingScheduleGroup = group;
    this.isCancelClassModalOpen = true;
  }

  closeCancelClassModal(): void {
    this.cancellingScheduleGroup = null;
    this.isCancelClassModalOpen = false;
  }

  confirmCancelClass(): void {
    const bookingsToCancel = this.getCancellableScheduleGroupBookings();

    if (bookingsToCancel.length === 0) {
      this.closeCancelClassModal();
      return;
    }

    const refunds = new Map<number, number>();
    bookingsToCancel.forEach((booking) => {
      if (!booking.userId) {
        return;
      }

      refunds.set(booking.userId, (refunds.get(booking.userId) || 0) + this.getBookingBonusAmount(booking));
    });

    this.users = this.users.map((user) => ({
      ...user,
      bonuses: user.bonuses + (refunds.get(user.id) || 0)
    }));
    this.bookingHistory = this.bookingHistory.map((booking) =>
      bookingsToCancel.some((cancelledBooking) => cancelledBooking.id === booking.id)
        ? { ...booking, status: 'CANCELLED' }
        : booking
    );
    this.persistUsers();
    this.persistBookings();
    void this.syncAdminState();
    this.closeCancelClassModal();
  }

  updateReservationStatus(id: number, status: ReservationStatus): void {
    this.bookingHistory = this.bookingHistory.map((booking) => booking.id === id ? { ...booking, status } : booking);
    this.persistBookings();
    void this.syncAdminState();
  }

  getTypeLabel(type: BookingType): string {
    return type === 'routes' ? 'Ruta' : 'Clase';
  }

  getImageUrl(image: string): string {
    if (!image || image.startsWith('http://') || image.startsWith('https://') || image.startsWith('assets/')) {
      return image;
    }

    return image.startsWith('/') ? `${API_BASE_URL}${image}` : image;
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

  getExperienceReservationsCount(experience: Experience): number {
    return this.getDeletableExperienceBookings(experience).length;
  }

  private getDeletableExperienceBookings(experience: Experience): BookingHistoryItem[] {
    return this.bookingHistory.filter((booking) => this.isBookingForExperience(booking, experience) && booking.status === 'CONFIRMED');
  }

  private getBookingBonusAmount(booking: BookingHistoryItem): number {
    const rawAmount = Number.parseInt(booking.payment, 10);
    return Number.isNaN(rawAmount) ? 0 : rawAmount;
  }

  private getCancellableScheduleGroupBookings(): BookingHistoryItem[] {
    const group = this.cancellingScheduleGroup;
    const referenceBooking = group?.bookings[0];

    if (!group || !referenceBooking) {
      return [];
    }

    return this.bookingHistory.filter((booking) =>
      booking.status === 'CONFIRMED'
      && booking.dateKey === this.adminDate
      && booking.hour === group.hour
      && this.isSameBookingClass(booking, referenceBooking)
    );
  }

  adjustUserBonuses(userId: number, delta: number): void {
    this.users = this.users.map((user) => user.id === userId
      ? { ...user, bonuses: Math.max(0, user.bonuses + delta) }
      : user);
    this.persistUsers();
    void this.syncAdminState();
  }

  applyUserBonusAdjustment(userId: number, direction: 1 | -1): void {
    const amount = Math.max(0, Number(this.userBonusAdjustments[userId]) || 0);
    if (amount === 0) {
      return;
    }

    this.adjustUserBonuses(userId, amount * direction);
    this.userBonusAdjustments[userId] = 0;
  }

  private setCurrentUser(user: CustomerUser): void {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    this.currentUserId = user.id;
    localStorage.setItem(CUSTOMER_SESSION_KEY, String(user.id));
    this.customerName = user.name;
    this.phone = user.phone;
  }

  private upsertCurrentUser(user: CustomerUser): void {
    const normalized = this.toCustomerUser(user);
    const exists = this.users.some((item) => item.id === normalized.id);
    this.users = exists
      ? this.users.map((item) => item.id === normalized.id ? normalized : item)
      : [normalized, ...this.users];
    this.setCurrentUser(normalized);
    this.persistUsers();
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

  private setCurrentUserBonuses(bonuses: number): void {
    if (!this.currentUser) {
      return;
    }

    this.users = this.users.map((user) => user.id === this.currentUserId
      ? { ...user, bonuses: Math.max(0, bonuses), updatedAt: new Date().toISOString() }
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
    if (window.location.pathname.includes('verify-email') || window.location.pathname.includes('reset-password')) {
      return 'login';
    }
    return 'client';
  }

  private async handleAuthLinks(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || '';

    if (window.location.pathname.includes('verify-email')) {
      this.view = 'login';
      this.authMode = 'login';
      if (!token) {
        this.authError = 'El enlace de verificación no es válido.';
        return;
      }
      try {
        const response = await fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`);
        if (!response.ok) {
          this.authError = 'El enlace no es válido o ha caducado.';
          return;
        }
        this.authNotice = 'Cuenta confirmada. Ya puedes iniciar sesión.';
        this.authError = '';
        window.history.replaceState({}, '', '/login');
      } catch {
        this.authError = 'No se pudo conectar con el servidor.';
      }
      return;
    }

    if (window.location.pathname.includes('reset-password')) {
      this.view = 'login';
      this.authMode = 'reset';
      this.resetToken = token;
      this.authError = token ? '' : 'El enlace de recuperación no es válido.';
      this.authNotice = '';
    }
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

  private async syncAdminState(): Promise<void> {
    const token = localStorage.getItem('centro_ecuestre_token');
    if (!token || !this.isAdminLoggedIn()) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/state`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          users: this.users.map((user) => this.toCustomerUserPayload(user)),
          experiences: this.experiences,
          bookingHistory: this.bookingHistory
        })
      });

      if (!response.ok) {
        this.warning = 'No se pudieron guardar los cambios en el servidor.';
      }
    } catch {
      this.warning = 'No se pudieron guardar los cambios en el servidor.';
    }
  }

  private loadLessonExperiences(): Experience[] {
    return this.loadFromStorage<Experience[]>(EXPERIENCES_KEY, this.defaultExperiences())
      .map((experience) => this.toExperience(experience));
  }

  private loadActiveLessonBookings(): BookingHistoryItem[] {
    return this.loadFromStorage<BookingHistoryItem[]>(BOOKINGS_KEY, [])
      .map((booking) => this.toBookingHistoryItem(booking))
      .filter((booking) => this.isBookingReminderActive(booking));
  }

  private toExperience(item: any): Experience {
    const experience = {
      id: Number(item.id || Date.now()),
      type: this.toBookingType(item.type),
      title: item.title || 'Experiencia',
      description: item.description || '',
      level: item.level || '',
      duration: item.duration || '',
      price: Number(item.price || 0),
      image: item.image || 'assets/route-sendero.jpg',
      active: item.active !== false,
      hours: Array.isArray(item.hours) ? item.hours : this.hours,
      hourMessages: item.hourMessages || {}
    };

    return {
      ...experience,
      hours: this.getExperienceHours(experience),
      hourMessages: this.sanitizeHourMessages(experience.hourMessages, experience.hours)
    };
  }

  private toCustomerUser(item: any): CustomerUser {
    const firstName = item.firstName || item.name || '';
    const lastName = item.lastName || '';
    return {
      id: Number(item.id),
      name: item.name || `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      phone: item.phone || '',
      email: item.email || '',
      password: item.password,
      role: item.role || 'USER',
      bonuses: Number(item.bonuses || 0),
      emailVerified: item.emailVerified !== false,
      active: item.active !== false,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
    };
  }

  private toCustomerUserPayload(user: CustomerUser): CustomerUser {
    return {
      ...this.toCustomerUser(user),
      role: user.role || 'USER',
      emailVerified: user.emailVerified !== false,
      active: user.active !== false
    };
  }

  private toBookingType(type: unknown): BookingType {
    return type === 'routes' ? 'routes' : 'lessons';
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
    return (this.selectedExperience ? this.isSlotFull(this.selectedExperience, dateKey, hour) : false) || this.isSlotPast(dateKey, hour);
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
        : this.sortHours([...currentHours, hour]),
      hourMessages: currentHours.includes(hour)
        ? this.removeHourMessage(hour)
        : { ...(this.experienceForm.hourMessages || {}) }
    };
  }

  isExperienceHourSelected(hour: string): boolean {
    return this.getExperienceFormHours().includes(hour);
  }

  addCustomExperienceHour(): void {
    const hour = this.normalizeCustomExperienceHour(this.customExperienceHour);
    if (!this.isValidHour(hour)) {
      this.customExperienceHourError = 'Introduce una hora valida con formato HH:MM.';
      return;
    }

    this.customExperienceHourError = '';
    this.experienceForm = {
      ...this.experienceForm,
      hours: this.sortHours([...this.getExperienceFormHours(), hour]),
      hourMessages: { ...(this.experienceForm.hourMessages || {}) }
    };
    this.customExperienceHour = '';
  }

  private normalizeCustomExperienceHour(value: string): string {
    const trimmed = value.trim();
    if (/^\d{4}$/.test(trimmed)) {
      return `${trimmed.slice(0, 2)}:${trimmed.slice(2)}`;
    }

    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      const [hour, minute] = trimmed.split(':');
      return `${hour.padStart(2, '0')}:${minute}`;
    }

    return trimmed;
  }

  getExperienceHourMessage(hour: string): string {
    return this.experienceForm.hourMessages?.[hour] || '';
  }

  setExperienceHourMessage(hour: string, message: string): void {
    this.experienceForm = {
      ...this.experienceForm,
      hourMessages: {
        ...(this.experienceForm.hourMessages || {}),
        [hour]: message
      }
    };
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

  private isSlotFull(experience: Experience, dateKey: string, hour: string): boolean {
    return this.getSlotBookingsCount(experience, dateKey, hour) >= this.getExperienceCapacity(experience);
  }

  private getExperienceCapacity(experience: Experience): number {
    return experience.type === 'routes' ? ROUTE_CAPACITY : LESSON_CAPACITY;
  }

  private getSlotBookingsCount(experience: Experience, dateKey: string, hour: string): number {
    return this.bookingHistory.filter((booking) =>
      booking.dateKey === dateKey
      && booking.hour === hour
      && this.isBookingForExperience(booking, experience)
      && booking.status !== 'CANCELLED'
      && this.isBookingReminderActive(booking)
    ).length;
  }

  private isBookingForExperience(booking: BookingHistoryItem, experience: Experience): boolean {
    return booking.experienceId ? booking.experienceId === experience.id : booking.title === experience.title;
  }

  private getBookingClassKey(booking: BookingHistoryItem): string {
    const classKey = booking.experienceId ? `experience:${booking.experienceId}` : `title:${booking.title}`;
    return `${classKey}:status:${booking.status}`;
  }

  private isSameBookingClass(booking: BookingHistoryItem, referenceBooking: BookingHistoryItem): boolean {
    if (booking.experienceId && referenceBooking.experienceId) {
      return booking.experienceId === referenceBooking.experienceId;
    }

    return booking.title === referenceBooking.title;
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

  private sanitizeHourMessages(messages?: Record<string, string>, hours?: string[]): Record<string, string> {
    const validHours = new Set(this.sanitizeExperienceHours(hours));
    return Object.fromEntries(
      Object.entries(messages || {})
        .map(([hour, message]) => [hour, message.trim()])
        .filter(([hour, message]) => validHours.has(hour) && message.length > 0)
    );
  }

  private getExperienceFormHours(): string[] {
    return this.sortHours((this.experienceForm.hours || []).filter((hour) => this.isValidHour(hour)));
  }

  private removeHourMessage(hour: string): Record<string, string> {
    const { [hour]: removed, ...messages } = this.experienceForm.hourMessages || {};
    return messages;
  }

  private getSelectedHourMessage(): string {
    const selectedExperience = this.selectedExperiences[0];
    return selectedExperience?.hourMessages?.[this.selectedHour]?.trim() || '';
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
      hours: [...this.hours],
      hourMessages: {}
    };
  }

  private defaultExperiences(): Experience[] {
    return [
      {
        id: 1,
        type: 'lessons',
        title: 'Clase de Iniciación',
        description: 'Sesión guiada en pista para aprender postura, control básico y seguridad desde cero.',
        level: 'Principiante',
        duration: '60 min',
        price: 38,
        image: 'assets/route-sendero.jpg',
        active: true,
        hours: ['11:00', '18:00', '18:45', '19:30'],
        hourMessages: {}
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
        hours: ['11:00', '18:00', '18:45', '19:30'],
        hourMessages: {}
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
