import type { ServicePriority, ServiceType } from "@/types/serviceOrder";

export type ServiceOrderNotificationType = "service_order_assigned" | "service_order_open_time";

/** Dados do alerta "colega ainda com tempo aberto na OS". */
export type OpenTimeAlertDetails = {
  finishedByName: string;
  finishedByTechnicianId: string | null;
  openTechnicianId: string;
  openTechnicianName: string;
  openSince: string | null;
};

export type AssignedOrderNotificationSummary = {
  id: string;
  number: number | null;
  title: string;
  description: string | null;
  clientName: string;
  unitName: string;
  location: string;
  serviceType: ServiceType | null;
  serviceTypeOther: string | null;
  priority: ServicePriority | null;
  scheduledFor: string | null;
  technicianNames: string[];
};

export type ServiceOrderAssignedNotification = {
  id: string;
  service_order_id: string;
  technician_id: string;
  user_id: string;
  type: ServiceOrderNotificationType;
  title: string;
  message: string | null;
  created_at: string;
  order: AssignedOrderNotificationSummary;
};

export type ServiceOrderNotification = ServiceOrderAssignedNotification & {
  openTime?: OpenTimeAlertDetails | null;
};
