import type { ServicePriority, ServiceType } from "@/types/serviceOrder";

export type ServiceOrderNotificationType = "service_order_assigned";

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
