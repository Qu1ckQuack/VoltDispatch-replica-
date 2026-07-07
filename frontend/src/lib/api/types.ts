export enum UserRole {
  HQ = 'HQ',
  DEALER = 'DEALER',
  COORDINATOR = 'COORDINATOR',
  TECHNICIAN = 'TECHNICIAN',
}

export enum TechnicianStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
}

export enum WorkOrderStatus {
  REQUESTED = 'REQUESTED',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  RESCHEDULED = 'RESCHEDULED',
  EN_ROUTE = 'EN_ROUTE',
  IN_PROGRESS = 'IN_PROGRESS',
  ISSUE = 'ISSUE',
  ESCALATED = 'ESCALATED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ImageType {
  BEFORE = 'BEFORE',
  AFTER = 'AFTER',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  LINE = 'LINE',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export enum ReportPeriod {
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export interface User {
  id: string
  email: string
  phone: string | null
  passwordHash: string
  role: UserRole
  lineUserId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  dealer?: Dealer | null
  coordinator?: Coordinator | null
  technician?: Technician | null
}

export interface Dealer {
  id: string
  userId: string
  companyName: string
  contactInfo: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface Coordinator {
  id: string
  userId: string
  department: string
  createdAt: string
  updatedAt: string
}

export interface Technician {
  id: string
  userId: string
  subDistrict: string
  status: TechnicianStatus
  lastLat: number | null
  lastLng: number | null
  lastLocationAt: string | null
  ratingAvg: number
  ratingCount: number
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  lineUserId: string | null
  address: string
  subDistrict: string
  accessToken: string | null
  createdAt: string
  updatedAt: string
}

export interface Device {
  id: string
  dealerId: string
  model: string
  serialNumber: string
  ipAddress: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface WorkOrder {
  id: string
  dealerId: string
  customerId: string
  technicianId: string | null
  deviceId: string
  status: WorkOrderStatus
  priority: number
  slaDeadline: string | null
  appointmentDate: string | null
  department: string | null
  subDistrict: string
  completedAt: string | null
  createdAt: string
  updatedAt: string
  dealer?: Dealer
  customer?: Customer
  technician?: Technician | null
  device?: Device
  statusHistory?: WorkOrderStatusHistory[]
  images?: WorkOrderImage[]
  rating?: Rating | null
}

export interface WorkOrderStatusHistory {
  id: string
  workOrderId: string
  fromStatus: WorkOrderStatus | null
  toStatus: WorkOrderStatus
  changedByUserId: string | null
  note: string | null
  changedAt: string
}

export interface WorkOrderImage {
  id: string
  workOrderId: string
  type: ImageType
  url: string
  uploadedBy: string | null
  uploadedAt: string
}

export interface Rating {
  id: string
  workOrderId: string
  customerId: string
  technicianId: string
  score: number
  comment: string | null
  createdAt: string
}

export interface Notification {
  id: string
  userId: string | null
  customerId: string | null
  channel: NotificationChannel
  type: string
  payload: Record<string, unknown>
  status: NotificationStatus
  sentAt: string | null
  createdAt: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: UserPayload
}

export interface UserPayload {
  sub: string
  email: string
  role: UserRole
  profileId: string
  iat: number
  exp: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateUserDto {
  email: string
  password: string
  role: UserRole
  phone?: string
}

export interface CreateTechnicianDto {
  userId: string
  subDistrict: string
}

export interface UpdateTechnicianDto {
  subDistrict?: string
}

export interface UpdateStatusDto {
  status: TechnicianStatus
}

export interface CreateCustomerDto {
  name: string
  phone?: string
  email?: string
  address: string
  subDistrict: string
}

export interface UpdateCustomerDto {
  name?: string
  phone?: string
  email?: string
  address?: string
  subDistrict?: string
}

export interface CreateCoordinatorDto {
  userId: string
  department: string
}

export interface UpdateCoordinatorDto {
  department?: string
}

export interface CreateDealerDto {
  userId: string
  companyName: string
  contactInfo?: Record<string, unknown>
}

export interface UpdateDealerDto {
  companyName?: string
  contactInfo?: Record<string, unknown>
}

export interface CreateDeviceDto {
  model: string
  serialNumber: string
  ipAddress?: string
  metadata?: Record<string, unknown>
}

export interface UpdateDeviceDto {
  model?: string
  serialNumber?: string
  ipAddress?: string
  metadata?: Record<string, unknown>
}

export interface CreateWorkOrderDto {
  customerId: string
  deviceId: string
  subDistrict: string
  priority?: number
  appointmentDate?: string
  department?: string
  slaDeadline?: string
}

export interface AssignWorkOrderDto {
  technicianId: string
}

export interface RescheduleWorkOrderDto {
  appointmentDate: string
}

export interface TransitionNoteDto {
  note?: string
}

export interface WorkOrderQueryDto {
  status?: WorkOrderStatus
  subDistrict?: string
  department?: string
  priority?: number
  page?: number
  limit?: number
}

export interface UploadImageDto {
  type: ImageType
}

export interface CreateRatingDto {
  score: number
  comment?: string
}

export interface SummaryQueryDto {
  period?: ReportPeriod
}

export interface SearchQueryDto {
  q: string
}

export interface UpdatePositionDto {
  lat: number
  lng: number
  orderId?: string
}

export interface ReportingOverview {
  totalOrders: number
  activeOrders: number
  completedToday: number
  slaBreached: number
  techniciansOnline: number
  avgRating: number
}

export interface ReportingSummary {
  period: string
  data: Array<{
    date: string
    total: number
    completed: number
    cancelled: number
  }>
}

export interface SearchResult {
  id: string
  type: 'work_order' | 'customer' | 'technician'
  title: string
  subtitle: string
  status: string
}
