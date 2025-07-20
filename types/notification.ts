export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: {
    status: string;
    timestamp: string;
  };
}

export interface SubscribeRequest {
  subscription: PushSubscriptionData;
}

export interface UnsubscribeRequest {
  endpoint: string;
}

export interface NotifyRequest {
  title: string;
  body: string;
  status: string;
}