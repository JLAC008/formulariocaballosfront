import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type BookingType = 'lessons' | 'routes';
type AppView = 'client' | 'login' | 'admin';
type AdminTab = 'schedule' | 'experiences' | 'bonusPacks' | 'users' | 'stats';
type ReservationStatus = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
type AuthMode = 'login' | 'register' | 'forgot' | 'reset';
type UserRole = 'guest' | 'customer' | 'admin';

interface Experience {
  id: number;
  type: BookingType;
  title: string;
  description: string;
  duration: string;
  price: number;
  capacity: number;
  image: string;
  active: boolean;
  fridayAvailable: boolean;
  fridayHours: string[];
  fridayHourMessages?: Record<string, string>;
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
  id: number;
  name: string;
  amount: number;
  price: number;
  priceCents: number;
  currency: string;
  active: boolean;
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

interface AdminUserForm {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  role: 'USER' | 'ADMIN';
  sessions: number;
}

interface ProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
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
  participantCount: number;
  guestCount: number;
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
const AUTH_TOKEN_KEY = 'centro_ecuestre_token';
const ADMIN_SESSION_KEY = 'centro_ecuestre_admin_session';
import { environment } from '../environments/environment';

const CUSTOMER_SESSION_KEY = 'centro_ecuestre_customer_session';
const USERS_KEY = 'centro_ecuestre_users';
const BOOKINGS_KEY = 'centro_ecuestre_bookings';
const EXPERIENCES_KEY = 'centro_ecuestre_experiences';
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
  bonusPacks: BonusPack[] = [];
  adminBonusPacks: BonusPack[] = [];
  readonly experienceTypes: ExperienceTypeOption[] = [
    { value: 'lessons', label: 'Clase' },
    { value: 'routes', label: 'Ruta' }
  ];
  readonly minDate = this.startOfDay(new Date());
  readonly maxDate = this.addMonths(this.minDate, 3);

  users: CustomerUser[] = this.loadFromStorage<CustomerUser[]>(USERS_KEY, []).map((user) => this.toCustomerUser(user));
  userNameFilter = '';
  userEmailFilter = '';
  userPhoneFilter = '';
  experiences: Experience[] = this.loadLessonExperiences();
  bookingHistory: BookingHistoryItem[] = this.loadActiveLessonBookings();

  view: AppView = this.getInitialView();
  activeAdminTab: AdminTab = 'schedule';
  authMode: AuthMode = 'login';
  activeExperienceType: BookingType = 'lessons';
  selectedExperienceIds: number[] = [];
  guestCount = 0;
  visibleMonth = new Date(this.minDate.getFullYear(), this.minDate.getMonth(), 1);
  selectedDate = this.getNextBookableDate(this.minDate);
  adminDate = this.toDateKey(this.minDate);
  selectedHour = '18:00';
  currentUserId: number | null = this.getStoredCustomerId();
  isBonusModalOpen = false;
  isMissingExperienceModalOpen = false;
  isReservationModalOpen = false;
  isHourNoticeModalOpen = false;
  isFullCapacityModalOpen = false;
  isLowBonusModalOpen = false;
  isHistoryModalOpen = false;
  isCustomerCancelModalOpen = false;
  isProfileModalOpen = false;
  isExperienceModalOpen = false;
  isDeleteExperienceModalOpen = false;
  isCancelClassModalOpen = false;
  isAdminUserModalOpen = false;
  isAccountMenuOpen = false;
  reservationMessage = '';
  reservationNoticeMessage = '';
  pendingHourNoticeMessage = '';
  cancellingCustomerBooking: BookingHistoryItem | null = null;
  showLowBonusAfterReservation = false;
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
  authInProgress = false;
  verificationEmailSentTo = '';
  profileForm: ProfileForm = this.blankProfileForm();
  profileError = '';
  profileNotice = '';
  profileInProgress = false;
  passwordForm: PasswordForm = this.blankPasswordForm();
  passwordError = '';
  passwordNotice = '';
  passwordInProgress = false;
  editingExperience: Experience | null = null;
  deletingExperience: Experience | null = null;
  cancellingScheduleGroup: AdminScheduleGroup | null = null;
  experienceForm: Experience = this.blankExperience();
  customExperienceHour = '';
  customExperienceHourError = '';
  customFridayHour = '';
  customFridayHourError = '';
  imageUploadError = '';
  imageUploadInProgress = false;
  isBonusCheckoutInProgress = false;
  bonusPackForm: BonusPack = this.blankBonusPack();
  editingBonusPack: BonusPack | null = null;
  bonusPackError = '';
  adminUserForm: AdminUserForm = this.blankAdminUserForm();
  editingAdminUser: CustomerUser | null = null;
  adminUserError = '';
  adminUserNotice = '';
  adminUserInProgress = false;

  constructor() {
    this.clearLegacyAuthStorage();
    void this.handleAuthLinks();
    void this.loadRemoteCurrentUser();
    void this.loadRemoteExperiences();
    void this.loadBonusPacks();
    void this.handleStripeBonusReturn();
    if (this.view === 'admin' && this.isAdminLoggedIn()) {
      void this.loadRemoteAdminState();
    }
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
    const isFriday = this.selectedDate.getDay() === 5;
    return this.experiences.filter((experience) =>
      experience.active
      && experience.type === this.activeExperienceType
      && (!isFriday || (experience.fridayAvailable && this.getFridayExperienceHours(experience).length > 0))
    );
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
      return this.getExperienceHoursForDate(this.selectedExperiences[0], this.selectedDate);
    }

    if (this.selectedDate.getDay() === 5) {
      return this.sortHours(this.filteredExperiences.flatMap((experience) => this.getFridayExperienceHours(experience)));
    }

    return this.sortHours([
      ...this.hours,
      ...this.filteredExperiences.flatMap((experience) => this.getExperienceHours(experience))
    ]);
  }

  get adminScheduleHours(): string[] {
    const adminDate = new Date(`${this.adminDate}T00:00:00`);
    const baseHours = adminDate.getDay() === 5 ? [] : this.hours;
    return this.sortHours([
      ...baseHours,
      ...this.experiences.flatMap((experience) => this.getExperienceHoursForDate(experience, adminDate)),
      ...this.adminDayReservations.map((booking) => booking.hour)
    ]);
  }

  get editableExperienceHours(): string[] {
    return this.getExperienceFormHours();
  }

  get editableExperienceSelectedHours(): string[] {
    return this.getExperienceFormHours();
  }

  get editableFridayHours(): string[] {
    return this.getExperienceFormFridayHours();
  }

  get editableFridaySelectedHours(): string[] {
    return this.getExperienceFormFridayHours();
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
    return 'Reservar sesión';
  }

  get actionHelpText(): string {
    return 'Debes iniciar sesión para usar o comprar sesiones';
  }

  get canReserve(): boolean {
    return this.selectedExperiences.length > 0
      && this.currentUser !== null
      && this.lessonBonuses >= this.selectedBonusCost
      && this.isSelectedHourAvailable
      && !this.hasCurrentUserBookedSelectedSlot
      && !this.isSelectedSlotFull
      && !this.isSelectedSlotTooCloseToStart;
  }

  get selectedBonusCost(): number {
    const baseCost = this.selectedExperiences.reduce((sum, experience) => sum + this.getExperienceBonusCost(experience), 0);
    return baseCost * this.selectedParticipantCount;
  }

  get selectedParticipantCount(): number {
    return this.selectedExperiences.length > 0 ? 1 + this.guestCount : 1;
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

  get isSelectedSlotTooCloseToStart(): boolean {
    return this.isSlotWithinBookingCutoff(this.toDateKey(this.selectedDate), this.selectedHour);
  }

  get selectedHourNotice(): string {
    return this.getSelectedHourMessage();
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

  get filteredUsers(): CustomerUser[] {
    const nameFilter = this.normalizeSearch(this.userNameFilter);
    const emailFilter = this.normalizeSearch(this.userEmailFilter);
    const phoneFilter = this.normalizeSearch(this.userPhoneFilter).replace(/\D/g, '');

    return this.users.filter((user) => {
      const name = this.normalizeSearch(user.name);
      const email = this.normalizeSearch(user.email);
      const phone = this.normalizeSearch(user.phone).replace(/\D/g, '');

      return (!nameFilter || name.includes(nameFilter))
        && (!emailFilter || email.includes(emailFilter))
        && (!phoneFilter || phone.includes(phoneFilter));
    });
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

  getAdminConfirmedPlacesByHour(hour: string): number {
    return this.getAdminConfirmedReservationsByHour(hour)
      .reduce((sum, booking) => sum + this.getBookingParticipantCount(booking), 0);
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

  getAdminScheduleGroupCapacity(group: AdminScheduleGroup): number {
    const booking = group.bookings[0];
    const experience = booking?.experienceId
      ? this.experiences.find((item) => item.id === booking.experienceId)
      : this.experiences.find((item) => item.title === booking?.title);
    return this.getExperienceCapacity(experience || null, booking?.type);
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

  formatNoticeText(value: string): string {
    const escaped = (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\r?\n/g, '<br>');
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
    void this.loadRemoteCurrentUser();
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
    void this.loadRemoteAdminState();
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
    this.guestCount = 0;
    this.ensureSelectedHourAvailable();
    this.confirmation = '';
    this.warning = '';
  }

  setGuestEnabled(enabled: boolean): void {
    this.guestCount = enabled ? 1 : 0;
    this.warning = '';
    this.confirmation = '';
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
      this.setAuthToken(auth.token);
      if (auth.role === 'ADMIN') {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
        sessionStorage.removeItem(CUSTOMER_SESSION_KEY);
        this.currentUserId = null;
        this.showAdmin();
        await this.loadRemoteAdminState();
      } else if (auth.user) {
        const user = this.toCustomerUser(auth.user);
        this.users = [user, ...this.users.filter((item) => item.id !== user.id)];
        this.setCurrentUser(user);
        await this.loadRemoteCurrentUser();
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
    const token = this.getAuthToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/bookings/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (this.handleExpiredSession(response)) return;
      if (!response.ok) return;
      const remote = await response.json();
      if (Array.isArray(remote)) this.bookingHistory = remote.map((item: any) => this.toBookingHistoryItem(item));
    } catch {
      // Keep the cached list as a temporary fallback.
    }
  }

  private async loadRemoteCurrentUser(): Promise<void> {
    const token = this.getAuthToken();
    if (!token || !this.currentUserId || this.isAdminLoggedIn()) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (this.handleExpiredSession(response)) return;
      if (!response.ok) return;
      const user = await response.json();
      this.upsertCurrentUser(user);
    } catch {
      // Keep the cached user until the API is reachable.
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
      this.warning = 'Pago cancelado. No se han añadido sesiones.';
      return;
    }

    const token = this.getAuthToken();
    if (!token || !sessionId) {
      this.warning = 'No se pudo confirmar el pago. Inicia sesión y revisa tus sesiones.';
      return;
    }

    try {
      const response = await fetch(`${API_URL}/payments/bonuses/status?sessionId=${encodeURIComponent(sessionId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (this.handleExpiredSession(response)) return;
      if (!response.ok) {
        this.warning = 'No se pudo confirmar el pago con Stripe.';
        return;
      }

      const payment: BonusPaymentStatusResponse = await response.json();
      if (payment.user) {
        this.upsertCurrentUser(payment.user);
      }
      if (payment.status === 'COMPLETED') {
        this.confirmation = `Pago confirmado. Se han añadido ${payment.bonuses} sesión${payment.bonuses === 1 ? '' : 'es'} a tu cuenta.`;
        this.warning = '';
      } else {
        this.warning = 'El pago todavía no aparece como completado. Vuelve a intentarlo en unos segundos.';
      }
    } catch {
      this.warning = 'No se pudo confirmar el pago con Stripe.';
    }
  }

  private async loadRemoteAdminState(): Promise<void> {
    const token = this.getAuthToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/state`, { headers: { Authorization: `Bearer ${token}` } });
      if (this.handleExpiredSession(response)) return;
      if (!response.ok) return;
      const state = await response.json();
      this.applyRemoteAdminState(state);
      await this.loadAdminBonusPacks();
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
      participantCount: this.normalizeParticipantCount(item.participantCount),
      guestCount: Math.max(0, this.normalizeParticipantCount(item.participantCount) - 1),
      status: item.status || 'CONFIRMED'
    };
  }

  async register(): Promise<void> {
    if (this.authInProgress) {
      return;
    }

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
      this.authInProgress = true;
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
      const auth = await response.json().catch(() => null);
      this.authError = '';
      this.authNotice = auth?.user?.emailVerified
        ? 'Cuenta creada correctamente. Ya puedes iniciar sesión.'
        : auth?.verificationResent
        ? 'La cuenta ya estaba pendiente de verificación. Te hemos enviado un nuevo correo.'
        : 'Te hemos enviado un correo para confirmar tu cuenta. Revisa tu bandeja de entrada.';
      this.verificationEmailSentTo = auth?.user?.emailVerified ? '' : email;
      this.loginPassword = '';
    } catch {
      this.authError = 'No se pudo conectar con el servidor.';
    } finally {
      this.authInProgress = false;
    }
  }

  logout(): void {
    this.clearAuthSession();
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
    this.clearAuthSession();
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

  handleAccountMenuButtonClick(): void {
    if (this.isGuest && window.matchMedia('(max-width: 760px)').matches) {
      this.showLogin('login');
      return;
    }

    this.toggleAccountMenu();
  }

  closeAccountMenu(): void {
    this.isAccountMenuOpen = false;
  }

  selectExperience(id: number): void {
    if (this.selectedExperienceIds.includes(id)) {
      this.selectedExperienceIds = [];
      this.guestCount = 0;
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
    this.ensureSelectedHourAvailable();
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

  async reserve(skipHourNotice = false): Promise<void> {
    const selectedCount = this.selectedExperiences.length;

    if (selectedCount === 0) {
      this.openMissingExperienceModal();
      this.confirmation = '';
      return;
    }

    if (!this.currentUser) {
      this.warning = 'Inicia sesión o crea una cuenta para reservar experiencias con sesiones.';
      this.showLogin('login');
      return;
    }

    const bonusCost = this.selectedBonusCost;
    const participantCount = this.selectedParticipantCount;

    if (!this.isInBookingRange(this.selectedDate)) {
      this.warning = 'Las experiencias no están disponibles sábados ni domingos. Elige un día entre semana.';
      this.confirmation = '';
      return;
    }

    if (this.lessonBonuses < bonusCost) {
      this.warning = 'No tienes sesiones suficientes. Compra más sesiones para poder reservar estas experiencias.';
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

    if (this.isSelectedSlotTooCloseToStart) {
      this.warning = 'No se puede reservar una experiencia cuando faltan 2 horas o menos para que empiece.';
      this.confirmation = '';
      return;
    }

    if (this.hasCurrentUserBookedSelectedSlot) {
      this.warning = 'Ya tienes una reserva para esa hora y ese dia. Elige otra hora disponible.';
      this.confirmation = '';
      return;
    }

    if (this.isSelectedSlotFull) {
      this.openFullCapacityModal();
      this.confirmation = '';
      return;
    }

    if (!skipHourNotice) {
      const hourNotice = this.getSelectedHourMessage();
      this.closeAllModals();
      this.pendingHourNoticeMessage = hourNotice;
      this.isHourNoticeModalOpen = true;
      this.warning = '';
      this.confirmation = '';
      return;
    }

    const customer = this.currentUser;
    const token = this.getAuthToken();
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
        phone: customer?.phone || this.phone,
        guestCount: this.guestCount
      })
    });

    if (this.handleExpiredSession(response)) return;
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      if (this.isFullCapacityError(error?.error)) {
        this.openFullCapacityModal();
        this.confirmation = '';
        return;
      }
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
      participantCount: this.normalizeParticipantCount(saved.participantCount),
      guestCount: Math.max(0, this.normalizeParticipantCount(saved.participantCount) - 1),
      status: saved.status || 'CONFIRMED'
    };

    this.bookingHistory = [booking, ...this.bookingHistory];
    this.persistBookings();
    if (typeof saved.remainingBonuses === 'number' && customer) {
      this.setCurrentUserBonuses(saved.remainingBonuses);
    }

    this.reservationMessage = `Has reservado ${selectedCount} experiencia${selectedCount === 1 ? '' : 's'} para ${participantCount} persona${participantCount === 1 ? '' : 's'} por ${this.formatBonusCost(bonusCost)}. Te quedan ${this.lessonBonuses} sesión${this.lessonBonuses === 1 ? '' : 'es'}.`;
    this.reservationNoticeMessage = '';
    this.closeAllModals();
    this.showLowBonusAfterReservation = this.lessonBonuses === 1;
    this.isReservationModalOpen = true;
    this.confirmation = '';
    this.warning = this.lessonBonuses === 0
      ? 'Has agotado tus sesiones. Compra más sesiones para reservar nuevas experiencias.'
      : '';
  }

  openBonusModal(): void {
    if (!this.currentUser) {
      this.warning = 'Para comprar sesiones necesitas iniciar sesión o crear una cuenta.';
      this.showLogin('login');
      return;
    }

    this.closeAllModals();
    this.isBonusModalOpen = true;
    this.confirmation = '';
  }

  closeBonusModal(): void {
    this.isBonusModalOpen = false;
  }

  openMissingExperienceModal(): void {
    this.closeAllModals();
    this.isMissingExperienceModalOpen = true;
  }

  closeMissingExperienceModal(): void {
    this.isMissingExperienceModalOpen = false;
  }

  closeLowBonusModal(): void {
    this.isLowBonusModalOpen = false;
  }

  buyBonusesFromLowBonusModal(): void {
    this.closeLowBonusModal();
    this.openBonusModal();
  }

  closeReservationModal(): void {
    this.isReservationModalOpen = false;
    this.reservationNoticeMessage = '';
    if (this.showLowBonusAfterReservation) {
      this.showLowBonusAfterReservation = false;
      this.isLowBonusModalOpen = true;
    }
  }

  closeHourNoticeModal(): void {
    this.isHourNoticeModalOpen = false;
    this.pendingHourNoticeMessage = '';
  }

  openFullCapacityModal(): void {
    this.closeAllModals();
    this.isFullCapacityModalOpen = true;
    this.warning = '';
  }

  closeFullCapacityModal(): void {
    this.isFullCapacityModalOpen = false;
  }

  confirmHourNoticeAndReserve(): void {
    this.isHourNoticeModalOpen = false;
    this.pendingHourNoticeMessage = '';
    void this.reserve(true);
  }

  openHistoryModal(): void {
    if (!this.currentUser) {
      this.warning = 'Inicia sesión para ver tus reservas y sesiones.';
      this.showLogin('login');
      return;
    }
    this.removeExpiredBookings();
    this.closeAllModals();
    this.closeAccountMenu();
    this.isHistoryModalOpen = true;
  }

  closeHistoryModal(): void {
    this.isHistoryModalOpen = false;
  }

  canCancelCustomerBooking(booking: BookingHistoryItem): boolean {
    return booking.status === 'CONFIRMED' && this.getBookingDateTime(booking).getTime() > Date.now() + 2 * 60 * 60 * 1000;
  }

  openCustomerCancelModal(booking: BookingHistoryItem): void {
    this.cancellingCustomerBooking = booking;
    this.isCustomerCancelModalOpen = true;
    this.warning = '';
  }

  closeCustomerCancelModal(): void {
    this.isCustomerCancelModalOpen = false;
    this.cancellingCustomerBooking = null;
  }

  async confirmCustomerCancelBooking(): Promise<void> {
    const booking = this.cancellingCustomerBooking;
    const token = this.getAuthToken();
    if (!booking || !token) {
      this.closeCustomerCancelModal();
      return;
    }

    try {
      const response = await fetch(`${API_URL}/bookings/${booking.id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (this.handleExpiredSession(response)) return;
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        this.warning = error?.error || 'No se pudo cancelar la reserva.';
        this.closeCustomerCancelModal();
        return;
      }

      const saved = await response.json();
      const cancelled = this.toBookingHistoryItem(saved);
      this.bookingHistory = this.bookingHistory.map((item) => item.id === cancelled.id ? { ...item, ...cancelled } : item);
      this.persistBookings();
      if (typeof saved.remainingBonuses === 'number') {
        this.setCurrentUserBonuses(saved.remainingBonuses);
      }
      this.confirmation = 'Reserva cancelada. Se ha devuelto la sesión a tu cuenta.';
      this.warning = '';
      this.closeCustomerCancelModal();
    } catch {
      this.warning = 'No se pudo conectar con el servidor.';
      this.closeCustomerCancelModal();
    }
  }

  openProfileModal(): void {
    if (!this.currentUser) {
      this.showLogin('login');
      return;
    }

    this.profileForm = {
      firstName: this.currentUser.firstName || '',
      lastName: this.currentUser.lastName || '',
      phone: this.currentUser.phone || '',
      email: this.currentUser.email || ''
    };
    this.profileError = '';
    this.profileNotice = '';
    this.passwordForm = this.blankPasswordForm();
    this.passwordError = '';
    this.passwordNotice = '';
    this.closeAllModals();
    this.closeAccountMenu();
    this.isProfileModalOpen = true;
  }

  closeProfileModal(): void {
    this.isProfileModalOpen = false;
    this.profileError = '';
    this.profileNotice = '';
    this.profileInProgress = false;
    this.passwordForm = this.blankPasswordForm();
    this.passwordError = '';
    this.passwordNotice = '';
    this.passwordInProgress = false;
  }

  async saveProfile(): Promise<void> {
    if (this.profileInProgress) {
      return;
    }

    const firstName = this.profileForm.firstName.trim().replace(/\s+/g, ' ');
    const lastName = this.profileForm.lastName.trim().replace(/\s+/g, ' ');
    const phone = this.profileForm.phone.trim().replace(/[\s-]/g, '');

    if (!NAME_PATTERN.test(firstName) || firstName.length < 2 || firstName.length > 80) {
      this.profileError = 'Introduce un nombre válido.';
      return;
    }
    if (!NAME_PATTERN.test(lastName) || lastName.length < 2 || lastName.length > 80) {
      this.profileError = 'Introduce unos apellidos válidos.';
      return;
    }
    if (!SPANISH_PHONE_PATTERN.test(phone)) {
      this.profileError = 'Introduce un teléfono español válido.';
      return;
    }

    const wantsPasswordChange = Boolean(
      this.passwordForm.currentPassword || this.passwordForm.newPassword || this.passwordForm.confirmPassword
    );
    if (wantsPasswordChange) {
      if (!this.passwordForm.currentPassword) {
        this.profileError = 'Introduce tu contraseña actual para cambiarla.';
        return;
      }
      if (!PASSWORD_PATTERN.test(this.passwordForm.newPassword)) {
        this.profileError = 'La nueva contraseña debe tener 8 caracteres, mayúscula, minúscula y número.';
        return;
      }
      if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
        this.profileError = 'Las contraseñas no coinciden.';
        return;
      }
    }

    const token = this.getAuthToken();
    if (!token) {
      this.handleExpiredSession(new Response(null, { status: 401 }));
      return;
    }

    try {
      this.profileInProgress = true;
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phone: phone.startsWith('+34') ? phone : `+34${phone}`
        })
      });

      if (this.handleExpiredSession(response)) return;
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        this.profileError = error?.error || 'No se pudo actualizar el perfil.';
        return;
      }

      const user = await response.json();
      if (wantsPasswordChange) {
        const passwordResponse = await fetch(`${API_URL}/auth/me/password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            currentPassword: this.passwordForm.currentPassword,
            newPassword: this.passwordForm.newPassword
          })
        });

        if (this.handleExpiredSession(passwordResponse)) return;
        if (!passwordResponse.ok) {
          const error = await passwordResponse.json().catch(() => null);
          this.profileError = error?.error || 'No se pudo cambiar la contraseña.';
          return;
        }
      }

      this.upsertCurrentUser(user);
      this.profileNotice = wantsPasswordChange
        ? 'Perfil y contraseña actualizados correctamente.'
        : 'Perfil actualizado correctamente.';
      this.profileError = '';
      this.passwordForm = this.blankPasswordForm();
      this.closeProfileModal();
      this.confirmation = this.profileNotice;
    } catch {
      this.profileError = 'No se pudo conectar con el servidor.';
    } finally {
      this.profileInProgress = false;
    }
  }

  async purchaseBonuses(pack: BonusPack): Promise<void> {
    if (!this.currentUser) {
      this.closeBonusModal();
      this.showLogin('login');
      return;
    }

    const token = this.getAuthToken();
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
        body: JSON.stringify({ packId: pack.id })
      });

      if (this.handleExpiredSession(response)) return;
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
    if (tab === 'users' || tab === 'stats' || tab === 'schedule') {
      void this.loadRemoteAdminState();
    } else if (tab === 'bonusPacks') {
      void this.loadAdminBonusPacks();
    }
  }

  async loadBonusPacks(): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/bonus-packs`);
      if (!response.ok) return;
      const packs = await response.json();
      if (Array.isArray(packs)) {
        this.bonusPacks = packs.map((pack: any) => this.toBonusPack(pack)).filter((pack) => pack.active);
      }
    } catch {
      // Keep the modal usable only when the API returns packs.
    }
  }

  async loadAdminBonusPacks(): Promise<void> {
    const token = this.getAuthToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/admin/bonus-packs`, { headers: { Authorization: `Bearer ${token}` } });
      if (this.handleExpiredSession(response)) return;
      if (!response.ok) {
        this.bonusPackError = 'No se pudieron cargar los packs de sesiones.';
        return;
      }
      const packs = await response.json();
      this.adminBonusPacks = Array.isArray(packs) ? packs.map((pack: any) => this.toBonusPack(pack)) : [];
      this.bonusPackError = '';
    } catch {
      this.bonusPackError = 'No se pudieron cargar los packs de sesiones.';
    }
  }

  editBonusPack(pack: BonusPack): void {
    this.editingBonusPack = pack;
    this.bonusPackForm = { ...pack };
    this.bonusPackError = '';
  }

  resetBonusPackForm(): void {
    this.editingBonusPack = null;
    this.bonusPackForm = this.blankBonusPack();
    this.bonusPackError = '';
  }

  async saveBonusPack(): Promise<void> {
    const token = this.getAuthToken();
    if (!token) return;
    const payload = this.toBonusPackPayload(this.bonusPackForm);
    if (!payload) return;

    const url = this.editingBonusPack
      ? `${API_URL}/admin/bonus-packs/${this.editingBonusPack.id}`
      : `${API_URL}/admin/bonus-packs`;

    try {
      const response = await fetch(url, {
        method: this.editingBonusPack ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (this.handleExpiredSession(response)) return;
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        this.bonusPackError = error?.error || 'No se pudo guardar el pack.';
        return;
      }
      this.resetBonusPackForm();
      await this.loadAdminBonusPacks();
      await this.loadBonusPacks();
    } catch {
      this.bonusPackError = 'No se pudo conectar con el servidor.';
    }
  }

  async toggleBonusPack(pack: BonusPack): Promise<void> {
    const token = this.getAuthToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/admin/bonus-packs/${pack.id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (this.handleExpiredSession(response)) return;
      if (!response.ok) {
        this.bonusPackError = 'No se pudo cambiar el estado del pack.';
        return;
      }
      await this.loadAdminBonusPacks();
      await this.loadBonusPacks();
    } catch {
      this.bonusPackError = 'No se pudo conectar con el servidor.';
    }
  }

  async deleteBonusPack(pack: BonusPack): Promise<void> {
    const token = this.getAuthToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/admin/bonus-packs/${pack.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (this.handleExpiredSession(response)) return;
      if (!response.ok) {
        this.bonusPackError = 'No se pudo eliminar el pack.';
        return;
      }
      await this.loadAdminBonusPacks();
      await this.loadBonusPacks();
    } catch {
      this.bonusPackError = 'No se pudo conectar con el servidor.';
    }
  }

  openExperienceModal(experience?: Experience): void {
    this.closeAllModals();
    this.editingExperience = experience || null;
    this.imageUploadError = '';
    this.imageUploadInProgress = false;
    this.experienceForm = experience
      ? {
          ...experience,
          hours: this.getExperienceHours(experience),
          fridayHours: this.getFridayExperienceHours(experience),
          fridayHourMessages: this.sanitizeHourMessages(experience.fridayHourMessages, this.getFridayExperienceHours(experience)),
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
    this.customFridayHour = '';
    this.customFridayHourError = '';
    this.imageUploadError = '';
    this.imageUploadInProgress = false;
  }

  onExperienceTypeChange(type: BookingType): void {
    if (this.editingExperience) {
      return;
    }

    this.experienceForm = {
      ...this.experienceForm,
      type,
      capacity: type === 'routes' ? 8 : 5
    };
  }

  async uploadExperienceImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const token = this.getAuthToken();
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

      if (this.handleExpiredSession(response)) return;
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
      price: this.normalizeBonusCost(this.experienceForm.price),
      capacity: this.normalizeExperienceCapacity(this.experienceForm.capacity, this.experienceForm.type),
      hours: this.sanitizeExperienceHours(this.experienceForm.hours),
      fridayHours: this.sanitizeOptionalExperienceHours(this.experienceForm.fridayHours),
      fridayHourMessages: this.sanitizeHourMessages(this.experienceForm.fridayHourMessages, this.experienceForm.fridayHours),
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
    this.closeAllModals();
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
    this.closeAllModals();
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

  openAdminUserModal(): void {
    this.closeAllModals();
    this.editingAdminUser = null;
    this.adminUserForm = this.blankAdminUserForm();
    this.adminUserError = '';
    this.adminUserNotice = '';
    this.isAdminUserModalOpen = true;
  }

  openEditAdminUserModal(user: CustomerUser): void {
    this.closeAllModals();
    this.editingAdminUser = user;
    this.adminUserForm = {
      firstName: user.firstName || user.name.split(' ')[0] || '',
      lastName: user.lastName || user.name.split(' ').slice(1).join(' '),
      phone: user.phone || '',
      email: user.email || '',
      password: '',
      role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
      sessions: Math.max(0, Number(user.bonuses || 0))
    };
    this.adminUserError = '';
    this.adminUserNotice = '';
    this.isAdminUserModalOpen = true;
  }

  closeAdminUserModal(): void {
    this.isAdminUserModalOpen = false;
    this.adminUserForm = this.blankAdminUserForm();
    this.editingAdminUser = null;
    this.adminUserError = '';
    this.adminUserInProgress = false;
  }

  async createAdminManagedUser(): Promise<void> {
    const firstName = this.adminUserForm.firstName.trim().replace(/\s+/g, ' ');
    const lastName = this.adminUserForm.lastName.trim().replace(/\s+/g, ' ');
    const phone = this.adminUserForm.phone.trim().replace(/[\s-]/g, '');
    const email = this.adminUserForm.email.trim().toLowerCase();
    const password = this.adminUserForm.password;
    const sessions = Math.max(0, Math.floor(Number(this.adminUserForm.sessions) || 0));

    this.adminUserError = '';
    this.adminUserNotice = '';

    if (!NAME_PATTERN.test(firstName) || !NAME_PATTERN.test(lastName)) {
      this.adminUserError = 'Introduce nombre y apellidos válidos.';
      return;
    }

    if (!SPANISH_PHONE_PATTERN.test(phone)) {
      this.adminUserError = 'Introduce un teléfono español válido.';
      return;
    }

    if (!EMAIL_PATTERN.test(email)) {
      this.adminUserError = 'Introduce un correo válido.';
      return;
    }

    if (!this.editingAdminUser && !PASSWORD_PATTERN.test(password)) {
      this.adminUserError = 'La contraseña debe tener 8 caracteres, mayúscula, minúscula y número.';
      return;
    }

    if (this.editingAdminUser && password && !PASSWORD_PATTERN.test(password)) {
      this.adminUserError = 'La nueva contraseña debe tener 8 caracteres, mayúscula, minúscula y número.';
      return;
    }

    const token = this.getAuthToken();
    if (!token) {
      this.adminUserError = 'Inicia sesión como administrador para gestionar usuarios.';
      return;
    }

    const isEditing = !!this.editingAdminUser;
    this.adminUserInProgress = true;
    try {
      const response = await fetch(isEditing ? `${API_URL}/admin/users/${this.editingAdminUser!.id}` : `${API_URL}/admin/users`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phone: phone.startsWith('+34') ? phone : `+34${phone}`,
          email,
          password,
          role: this.adminUserForm.role,
          sessions,
          active: true
        })
      });

      if (this.handleExpiredSession(response)) return;
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        this.adminUserError = error?.error || (isEditing ? 'No se pudo actualizar el usuario.' : 'No se pudo crear el usuario.');
        return;
      }

      const saved = this.toCustomerUser(await response.json());
      this.users = isEditing
        ? this.users.map((user) => user.id === saved.id ? saved : user)
        : [saved, ...this.users.filter((user) => user.id !== saved.id)];
      this.persistUsers();
      this.adminUserForm = this.blankAdminUserForm();
      this.editingAdminUser = null;
      this.adminUserNotice = isEditing ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.';
      this.isAdminUserModalOpen = false;
    } catch {
      this.adminUserError = 'No se pudo conectar con el servidor.';
    } finally {
      this.adminUserInProgress = false;
    }
  }

  getExperienceReservationsCount(experience: Experience): number {
    return this.getDeletableExperienceBookings(experience).length;
  }

  private getDeletableExperienceBookings(experience: Experience): BookingHistoryItem[] {
    return this.bookingHistory.filter((booking) => this.isBookingForExperience(booking, experience) && booking.status === 'CONFIRMED');
  }

  private getBookingBonusAmount(booking: BookingHistoryItem): number {
    if (booking.status !== 'CONFIRMED') {
      return 0;
    }

    return this.normalizeBonusCost(booking.amount);
  }

  getExperienceBonusCost(experience: Experience): number {
    return this.normalizeBonusCost(experience.price);
  }

  formatBonusCost(cost: number): string {
    const normalized = this.normalizeBonusCost(cost);
    return `${normalized} sesión${normalized === 1 ? '' : 'es'}`;
  }

  private normalizeBonusCost(value: unknown): number {
    const cost = Math.ceil(Number(value));
    return Number.isFinite(cost) && cost > 0 && cost <= 10 ? cost : 1;
  }

  private normalizeExperienceCapacity(value: unknown, type?: BookingType): number {
    const fallback = type === 'routes' ? 8 : 5;
    const capacity = Math.floor(Number(value));
    return Number.isFinite(capacity) && capacity >= 1 && capacity <= 50 ? capacity : fallback;
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

  private setCurrentUser(user: CustomerUser): void {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    this.currentUserId = user.id;
    sessionStorage.setItem(CUSTOMER_SESSION_KEY, String(user.id));
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
    return !!this.getAuthToken() && sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  }

  private getStoredCustomerId(): number | null {
    if (!this.getAuthToken()) {
      return null;
    }

    const raw = sessionStorage.getItem(CUSTOMER_SESSION_KEY);
    const id = raw ? Number(raw) : null;
    return id && this.users.some((user) => user.id === id) ? id : null;
  }

  private setAuthToken(token: string): void {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  private getAuthToken(): string | null {
    return sessionStorage.getItem(AUTH_TOKEN_KEY);
  }

  private clearAuthSession(): void {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(CUSTOMER_SESSION_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
  }

  private clearLegacyAuthStorage(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
  }

  private handleExpiredSession(response: Response): boolean {
    if (response.status !== 401 && response.status !== 403) {
      return false;
    }

    this.clearAuthSession();
    this.currentUserId = null;
    this.view = 'login';
    this.authMode = 'login';
    this.authNotice = '';
    this.authError = 'Tu sesión ha caducado. Vuelve a iniciar sesión.';
    this.warning = '';
    this.confirmation = '';
    this.isBonusCheckoutInProgress = false;
    this.imageUploadInProgress = false;
    this.profileInProgress = false;
    this.passwordInProgress = false;
    this.isProfileModalOpen = false;
    this.closeAccountMenu();
    return true;
  }

  private closeAllModals(): void {
    this.isBonusModalOpen = false;
    this.isMissingExperienceModalOpen = false;
    this.isReservationModalOpen = false;
    this.isHourNoticeModalOpen = false;
    this.isFullCapacityModalOpen = false;
    this.isLowBonusModalOpen = false;
    this.isHistoryModalOpen = false;
    this.isCustomerCancelModalOpen = false;
    this.isProfileModalOpen = false;
    this.isExperienceModalOpen = false;
    this.isDeleteExperienceModalOpen = false;
    this.isCancelClassModalOpen = false;
    this.isAdminUserModalOpen = false;
    this.editingAdminUser = null;
    this.reservationNoticeMessage = '';
    this.pendingHourNoticeMessage = '';
    this.cancellingCustomerBooking = null;
    this.showLowBonusAfterReservation = false;
    this.profileError = '';
    this.profileNotice = '';
    this.passwordError = '';
    this.passwordNotice = '';
    this.passwordForm = this.blankPasswordForm();
    this.adminUserError = '';
    this.deletingExperience = null;
    this.cancellingScheduleGroup = null;
  }

  private isFullCapacityError(message: unknown): boolean {
    return typeof message === 'string' && this.normalizeSearch(message).includes('aforo completo');
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
    const token = this.getAuthToken();
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

      if (this.handleExpiredSession(response)) return;
      if (!response.ok) {
        this.warning = 'No se pudieron guardar los cambios en el servidor.';
        return;
      }

      const state = await response.json().catch(() => null);
      if (state) {
        this.applyRemoteAdminState(state);
      }
    } catch {
      this.warning = 'No se pudieron guardar los cambios en el servidor.';
    }
  }

  private applyRemoteAdminState(state: any): void {
    if (Array.isArray(state.users)) this.users = state.users.map((item: any) => this.toCustomerUser(item));
    if (Array.isArray(state.experiences)) this.experiences = state.experiences.map((item: any) => this.toExperience(item));
    if (Array.isArray(state.bookingHistory)) this.bookingHistory = state.bookingHistory.map((item: any) => this.toBookingHistoryItem(item));
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
      duration: item.duration || '',
      price: this.normalizeBonusCost(item.price),
      capacity: this.normalizeExperienceCapacity(item.capacity, this.toBookingType(item.type)),
      image: item.image || 'assets/route-sendero.jpg',
      active: item.active !== false,
      fridayAvailable: item.fridayAvailable === true,
      fridayHours: Array.isArray(item.fridayHours) ? item.fridayHours : [],
      fridayHourMessages: item.fridayHourMessages || {},
      hours: Array.isArray(item.hours) ? item.hours : this.hours,
      hourMessages: item.hourMessages || {}
    };

    return {
      ...experience,
      hours: this.getExperienceHours(experience),
      fridayHours: this.getFridayExperienceHours(experience),
      fridayHourMessages: this.sanitizeHourMessages(experience.fridayHourMessages, experience.fridayHours),
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

  private toBonusPack(item: any): BonusPack {
    const priceCents = Number(item.priceCents ?? Math.round(Number(item.price || 0) * 100));
    return {
      id: Number(item.id || Date.now()),
      name: item.name || `${Number(item.bonuses || item.amount || 1)} sesión${Number(item.bonuses || item.amount || 1) === 1 ? '' : 'es'}`,
      amount: Math.max(1, Number(item.bonuses || item.amount || 1)),
      price: Math.max(1, priceCents / 100),
      priceCents: Math.max(100, priceCents),
      currency: (item.currency || 'eur').toLowerCase(),
      active: item.active !== false
    };
  }

  private toBonusPackPayload(pack: BonusPack): any | null {
    const amount = Math.floor(Number(pack.amount));
    const price = Number(pack.price);
    if (!pack.name.trim()) {
      this.bonusPackError = 'Introduce un nombre para el pack.';
      return null;
    }
    if (!Number.isFinite(amount) || amount < 1) {
      this.bonusPackError = 'El pack debe tener al menos 1 sesión.';
      return null;
    }
    if (!Number.isFinite(price) || price < 1) {
      this.bonusPackError = 'El precio debe ser al menos 1 EUR.';
      return null;
    }

    const name = pack.name.trim();
    const currentId = this.editingBonusPack?.id;
    const duplicateName = this.adminBonusPacks.some((item) =>
      item.name.trim().toLowerCase() === name.toLowerCase() && item.id !== currentId
    );
    if (duplicateName) {
      this.bonusPackError = 'Ya existe un pack con ese nombre.';
      return null;
    }

    return {
      name,
      bonuses: amount,
      priceCents: Math.round(price * 100),
      currency: (pack.currency || 'eur').toLowerCase(),
      active: pack.active !== false
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
    return !this.isInBookingRange(this.selectedDate)
      || (this.selectedExperience ? this.isSlotFull(this.selectedExperience, dateKey, hour) : false)
      || this.isSlotWithinBookingCutoff(dateKey, hour);
  }

  toggleExperienceHour(hour: string): void {
    const currentHours = this.getExperienceFormHours();

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

  removeExperienceHour(hour: string): void {
    const currentHours = this.getExperienceFormHours();
    if (!currentHours.includes(hour)) {
      return;
    }

    this.experienceForm = {
      ...this.experienceForm,
      hours: currentHours.filter((selectedHour) => selectedHour !== hour),
      hourMessages: this.removeHourMessage(hour)
    };
  }

  isExperienceHourSelected(hour: string): boolean {
    return this.getExperienceFormHours().includes(hour);
  }

  toggleFridayHour(hour: string): void {
    const currentHours = this.getExperienceFormFridayHours();
    this.experienceForm = {
      ...this.experienceForm,
      fridayHours: currentHours.includes(hour)
        ? currentHours.filter((selectedHour) => selectedHour !== hour)
        : this.sortHours([...currentHours, hour]),
      fridayHourMessages: currentHours.includes(hour)
        ? this.removeFridayHourMessage(hour)
        : { ...(this.experienceForm.fridayHourMessages || {}) }
    };
  }

  removeFridayHour(hour: string): void {
    const currentHours = this.getExperienceFormFridayHours();
    if (!currentHours.includes(hour)) {
      return;
    }

    this.experienceForm = {
      ...this.experienceForm,
      fridayHours: currentHours.filter((selectedHour) => selectedHour !== hour),
      fridayHourMessages: this.removeFridayHourMessage(hour)
    };
  }

  isFridayHourSelected(hour: string): boolean {
    return this.getExperienceFormFridayHours().includes(hour);
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

  addCustomFridayHour(): void {
    const hour = this.normalizeCustomExperienceHour(this.customFridayHour);
    if (!this.isValidHour(hour)) {
      this.customFridayHourError = 'Introduce una hora válida con formato HH:MM.';
      return;
    }

    this.customFridayHourError = '';
    this.experienceForm = {
      ...this.experienceForm,
      fridayHours: this.sortHours([...this.getExperienceFormFridayHours(), hour]),
      fridayHourMessages: { ...(this.experienceForm.fridayHourMessages || {}) }
    };
    this.customFridayHour = '';
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

  private normalizeSearch(value: string | null | undefined): string {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
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

  getFridayHourMessage(hour: string): string {
    return this.experienceForm.fridayHourMessages?.[hour] || '';
  }

  setFridayHourMessage(hour: string, message: string): void {
    this.experienceForm = {
      ...this.experienceForm,
      fridayHourMessages: {
        ...(this.experienceForm.fridayHourMessages || {}),
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
    return this.getSlotBookingsCount(experience, dateKey, hour) + this.selectedParticipantCount > this.getExperienceCapacity(experience);
  }

  getExperienceCapacity(experience: Experience | null, fallbackType?: BookingType): number {
    return this.normalizeExperienceCapacity(experience?.capacity, experience?.type || fallbackType);
  }

  private getSlotBookingsCount(experience: Experience, dateKey: string, hour: string): number {
    return this.bookingHistory
      .filter((booking) =>
        booking.dateKey === dateKey
        && booking.hour === hour
        && this.isBookingForExperience(booking, experience)
        && booking.status !== 'CANCELLED'
        && this.isBookingReminderActive(booking)
      )
      .reduce((sum, booking) => sum + this.getBookingParticipantCount(booking), 0);
  }

  getAdminScheduleGroupParticipantCount(group: AdminScheduleGroup): number {
    return group.bookings
      .filter((booking) => booking.status !== 'CANCELLED')
      .reduce((sum, booking) => sum + this.getBookingParticipantCount(booking), 0);
  }

  getBookingParticipantCount(booking: BookingHistoryItem): number {
    return this.normalizeParticipantCount(booking.participantCount);
  }

  private normalizeParticipantCount(value: unknown): number {
    const participants = Math.floor(Number(value));
    return Number.isFinite(participants) && participants >= 1 ? Math.min(participants, 2) : 1;
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

  private isSlotWithinBookingCutoff(dateKey: string, hour: string): boolean {
    return new Date(`${dateKey}T${hour}:00`).getTime() <= Date.now() + 2 * 60 * 60 * 1000;
  }

  private ensureSelectedHourAvailable(): void {
    if (this.availableHours.includes(this.selectedHour)) {
      return;
    }

    this.selectedHour = this.availableHours[0] || this.hours[0];
  }

  private getExperienceHours(experience: Experience): string[] {
    return Array.isArray(experience.hours)
      ? this.sanitizeOptionalExperienceHours(experience.hours)
      : [...this.hours];
  }

  private getExperienceHoursForDate(experience: Experience, date: Date): string[] {
    return date.getDay() === 5 ? this.getFridayExperienceHours(experience) : this.getExperienceHours(experience);
  }

  private getFridayExperienceHours(experience: Experience): string[] {
    return this.sanitizeOptionalExperienceHours(experience.fridayHours);
  }

  private sanitizeExperienceHours(hours?: string[]): string[] {
    return this.sanitizeOptionalExperienceHours(hours);
  }

  private sanitizeOptionalExperienceHours(hours?: string[]): string[] {
    return this.sortHours([...(hours || [])].filter((hour) => this.isValidHour(hour)));
  }

  private sanitizeHourMessages(messages?: Record<string, string>, hours?: string[]): Record<string, string> {
    const validHours = new Set(this.sanitizeOptionalExperienceHours(hours));
    return Object.fromEntries(
      Object.entries(messages || {})
        .map(([hour, message]) => [hour, message.trim()])
        .filter(([hour, message]) => validHours.has(hour) && message.length > 0)
    );
  }

  private getExperienceFormHours(): string[] {
    return this.sortHours((this.experienceForm.hours || []).filter((hour) => this.isValidHour(hour)));
  }

  private getExperienceFormFridayHours(): string[] {
    return this.sortHours((this.experienceForm.fridayHours || []).filter((hour) => this.isValidHour(hour)));
  }

  private removeHourMessage(hour: string): Record<string, string> {
    const { [hour]: removed, ...messages } = this.experienceForm.hourMessages || {};
    return messages;
  }

  private removeFridayHourMessage(hour: string): Record<string, string> {
    const { [hour]: removed, ...messages } = this.experienceForm.fridayHourMessages || {};
    return messages;
  }

  private getSelectedHourMessage(): string {
    const selectedExperience = this.selectedExperiences[0];
    if (this.selectedDate.getDay() === 5) {
      return selectedExperience?.fridayHourMessages?.[this.selectedHour]?.trim() || '';
    }

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
      duration: '60 min',
      price: 1,
      capacity: 5,
      image: 'assets/route-sendero.jpg',
      active: true,
      fridayAvailable: false,
      fridayHours: [],
      fridayHourMessages: {},
      hours: [...this.hours],
      hourMessages: {}
    };
  }

  private blankBonusPack(): BonusPack {
    return {
      id: 0,
      name: 'Pack 5 sesiones',
      amount: 5,
      price: 100,
      priceCents: 10000,
      currency: 'eur',
      active: true
    };
  }

  private blankAdminUserForm(): AdminUserForm {
    return {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
      role: 'USER',
      sessions: 0
    };
  }

  private blankProfileForm(): ProfileForm {
    return {
      firstName: '',
      lastName: '',
      phone: '',
      email: ''
    };
  }

  private blankPasswordForm(): PasswordForm {
    return {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  }

  private defaultExperiences(): Experience[] {
    return [
      {
        id: 1,
        type: 'lessons',
        title: 'Clase de Iniciación',
        description: 'Sesión guiada en pista para aprender postura, control básico y seguridad desde cero.',
        duration: '60 min',
        price: 1,
        capacity: 5,
        image: 'assets/route-sendero.jpg',
        active: true,
        fridayAvailable: false,
        fridayHours: [],
        fridayHourMessages: {},
        hours: ['11:00', '18:00', '18:45', '19:30'],
        hourMessages: {}
      },
      {
        id: 2,
        type: 'lessons',
        title: 'Clase Tecnica Privada',
        description: 'Trabajo personalizado para mejorar ayudas, asiento y confianza con seguimiento individual.',
        duration: '75 min',
        price: 1,
        capacity: 5,
        image: 'assets/route-crepusculo.jpg',
        active: true,
        fridayAvailable: false,
        fridayHours: [],
        fridayHourMessages: {},
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
    return day >= this.minDate && day <= this.maxDate && !this.isWeekend(day);
  }

  private getNextBookableDate(date: Date): Date {
    const nextDate = this.startOfDay(date);
    while (this.isWeekend(nextDate)) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    return nextDate;
  }

  private isWeekend(date: Date): boolean {
    return date.getDay() === 0 || date.getDay() === 6;
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

