import { Linking } from "react-native";
import * as Application from "expo-application";

export function openPlaySubscriptionManagement(productId?: string): Promise<void> {
  const pkg = Application.applicationId ?? "com.kjstudio.flashvoca";
  const url = productId
    ? `https://play.google.com/store/account/subscriptions?sku=${productId}&package=${pkg}`
    : `https://play.google.com/store/account/subscriptions`;
  return Linking.openURL(url);
}
