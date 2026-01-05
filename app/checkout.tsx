import { DeliveryStep } from '@/components/checkout/delivery-step';
import { PaymentStep } from '@/components/checkout/payment-step';
import { ShippingStep } from '@/components/checkout/shipping-step';
import { Colors } from '@/constants/theme';
import { useCart } from '@/context/cart-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { sdk } from '@/lib/sdk';
import type { HttpTypes } from '@medusajs/types';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

type CheckoutStep = 'delivery' | 'shipping' | 'payment';

export default function CheckoutScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { cart, refreshCart } = useCart();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>('delivery');
  const [loading, setLoading] = useState(false);

  // Contact & Address state
  const [email, setEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    postalCode: '',
    countryCode: '',
    phone: '',
  });
  const [useSameForBilling, setUseSameForBilling] = useState(true);
  const [billingAddress, setBillingAddress] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    postalCode: '',
    countryCode: '',
    phone: '',
  });

  // Shipping & Payment state
  const [shippingOptions, setShippingOptions] = useState<HttpTypes.StoreCartShippingOption[]>([]);
  const [selectedShippingOption, setSelectedShippingOption] = useState<string | null>(null);
  const [paymentProviders, setPaymentProviders] = useState<HttpTypes.StorePaymentProvider[]>([]);
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<string | null>(null);

  // Sync form with cart
  useEffect(() => {
    setEmail(cart?.email || '');
    setShippingAddress({
      firstName: cart?.shipping_address?.first_name || '',
      lastName: cart?.shipping_address?.last_name || '',
      address: cart?.shipping_address?.address_1 || '',
      city: cart?.shipping_address?.city || '',
      postalCode: cart?.shipping_address?.postal_code || '',
      countryCode: cart?.shipping_address?.country_code || '',
      phone: cart?.shipping_address?.phone || '',
    });
    
    const hasDifferentBilling = cart?.billing_address && 
      (cart.billing_address.address_1 !== cart.shipping_address?.address_1);
    
    setUseSameForBilling(!hasDifferentBilling);
    setBillingAddress({
      firstName: cart?.billing_address?.first_name || '',
      lastName: cart?.billing_address?.last_name || '',
      address: cart?.billing_address?.address_1 || '',
      city: cart?.billing_address?.city || '',
      postalCode: cart?.billing_address?.postal_code || '',
      countryCode: cart?.billing_address?.country_code || '',
      phone: cart?.billing_address?.phone || '',
    });
    
    if (!cart) {
      setSelectedShippingOption(null);
      setSelectedPaymentProvider(null);
      setCurrentStep('delivery');
    }
  }, [cart]);

  // Fetch Options
  const fetchShippingOptions = useCallback(async () => {
    if (!cart) return;
    try {
      setLoading(true);
      const { shipping_options } = await sdk.store.fulfillment.listCartOptions({ cart_id: cart.id });
      setShippingOptions(shipping_options || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load shipping options');
    } finally {
      setLoading(false);
    }
  }, [cart]);

  const fetchPaymentProviders = useCallback(async () => {
    if (!cart) return;
    try {
      setLoading(true);
      const { payment_providers } = await sdk.store.payment.listPaymentProviders({ region_id: cart.region_id || '' });
      setPaymentProviders(payment_providers || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load payment providers');
    } finally {
      setLoading(false);
    }
  }, [cart]);

  useEffect(() => {
    if (currentStep === 'shipping') fetchShippingOptions();
    if (currentStep === 'payment') fetchPaymentProviders();
  }, [currentStep, fetchShippingOptions, fetchPaymentProviders]);

  // Handlers
  const handleDeliveryNext = async () => {
    if (!email || !shippingAddress.firstName || !shippingAddress.address) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    if (!cart) return;

    try {
      setLoading(true);
      const addressData = {
        first_name: shippingAddress.firstName,
        last_name: shippingAddress.lastName,
        address_1: shippingAddress.address,
        city: shippingAddress.city,
        postal_code: shippingAddress.postalCode,
        country_code: shippingAddress.countryCode,
        phone: shippingAddress.phone,
      };

      await sdk.store.cart.update(cart.id, {
        email,
        shipping_address: addressData,
        billing_address: useSameForBilling ? addressData : {
          first_name: billingAddress.firstName,
          last_name: billingAddress.lastName,
          address_1: billingAddress.address,
          city: billingAddress.city,
          postal_code: billingAddress.postalCode,
          country_code: billingAddress.countryCode,
          phone: billingAddress.phone,
        },
      });

      await refreshCart();
      setCurrentStep('shipping');
    } catch (err) {
      Alert.alert('Error', 'Failed to save information');
    } finally {
      setLoading(false);
    }
  };

  const handleShippingNext = async () => {
    if (!selectedShippingOption || !cart) {
      Alert.alert('Error', 'Select a shipping method');
      return;
    }
    try {
      setLoading(true);
      await sdk.store.cart.addShippingMethod(cart.id, { option_id: selectedShippingOption });
      await refreshCart();
      setCurrentStep('payment');
    } catch (err) {
      Alert.alert('Error', 'Failed to save shipping');
    } finally {
      setLoading(false);
    }
  };

  // 👇 FIXED: Pass the full 'cart' object, just like in your frontend repo
// 👇 FIXED: Use Metadata to pass the URL
  const handlePlaceOrder = async () => {
    if (!selectedPaymentProvider || !cart) {
      Alert.alert('Error', 'Select a payment provider');
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = Linking.createURL('order-confirmation'); 
      console.log("🔗 Redirecting to:", redirectUrl);

      // 1. UPDATE CART METADATA (Pass the URL securely here)
      await sdk.store.cart.update(cart.id, {
        metadata: {
          mobile_return_url: redirectUrl
        }
      });

      // 2. INITIATE PAYMENT (Pass 'cart' object, NO context/data field)
      const response = await sdk.store.payment.initiatePaymentSession(cart, {
        provider_id: selectedPaymentProvider,
      });

      // 3. Handle Cashfree Logic
      const collection = response.payment_collection;

      if (selectedPaymentProvider === 'cashfree') {
        const session = collection?.payment_sessions?.find(
          (s) => s.provider_id === 'cashfree'
        );
        
        // This link comes from the backend service (see Step 2)
        const paymentLink = session?.data?.payment_link as string;

        if (paymentLink) {
          const result = await WebBrowser.openAuthSessionAsync(paymentLink, redirectUrl);
          
          if (result.type === 'success' || result.type === 'dismiss') {
            await completeOrder();
          } else {
            setLoading(false);
          }
          return;
        } 
      }

      await completeOrder();

    } catch (err: any) {
      console.error('Order Error:', err);
      Alert.alert('Error', err?.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };
  const completeOrder = async () => {
    try {
      if (!cart) return;
      
      const result = await sdk.store.cart.complete(cart.id);

      if (result.type === 'order') {
        router.replace(`/order-confirmation/${result.order.id}`);
      } else {
        Alert.alert('Payment Incomplete', result.error?.message || 'Please try paying again.');
      }
    } catch (err: any) {
      console.error('Completion Error:', err);
      Alert.alert('Error', err?.message || 'Failed to complete order');
    } finally {
      setLoading(false);
    }
  };

  if (!cart) return <View style={styles.centerContainer}><Text>No Cart Found</Text></View>;

  const activeStepBg = colorScheme === 'dark' ? '#fff' : colors.tint;
  const activeStepText = colorScheme === 'dark' ? '#000' : '#fff';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.steps, { borderBottomColor: colors.border }]}>
        {(['delivery', 'shipping', 'payment'] as CheckoutStep[]).map((step, index) => (
          <View key={step} style={styles.stepIndicator}>
            <View style={[styles.stepCircle, { backgroundColor: currentStep === step ? activeStepBg : colors.icon + '30' }]}>
              <Text style={[styles.stepNumber, { color: currentStep === step ? activeStepText : colors.icon }]}>{index + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, { color: currentStep === step ? colors.text : colors.icon, fontWeight: currentStep === step ? '600' : '400' }]}>
              {step.charAt(0).toUpperCase() + step.slice(1)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.content}>
        {currentStep === 'delivery' && (
          <DeliveryStep
            email={email}
            shippingAddress={shippingAddress}
            billingAddress={billingAddress}
            useSameForBilling={useSameForBilling}
            loading={loading}
            onEmailChange={setEmail}
            onShippingAddressChange={(f, v) => setShippingAddress(p => ({ ...p, [f]: v }))}
            onBillingAddressChange={(f, v) => setBillingAddress(p => ({ ...p, [f]: v }))}
            onUseSameForBillingChange={setUseSameForBilling}
            onNext={handleDeliveryNext}
          />
        )}
        {currentStep === 'shipping' && (
          <ShippingStep
            shippingOptions={shippingOptions}
            selectedShippingOption={selectedShippingOption}
            currencyCode={cart.currency_code}
            loading={loading}
            onSelectOption={setSelectedShippingOption}
            onBack={() => setCurrentStep('delivery')}
            onNext={handleShippingNext}
          />
        )}
        {currentStep === 'payment' && (
          <PaymentStep
            cart={cart}
            paymentProviders={paymentProviders}
            selectedPaymentProvider={selectedPaymentProvider}
            loading={loading}
            onSelectProvider={setSelectedPaymentProvider}
            onBack={() => setCurrentStep('shipping')}
            onPlaceOrder={handlePlaceOrder}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  steps: { flexDirection: 'row', justifyContent: 'space-around', padding: 20, borderBottomWidth: 1 },
  stepIndicator: { alignItems: 'center' },
  stepCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stepNumber: { fontSize: 16, fontWeight: '600' },
  stepLabel: { fontSize: 12 },
  content: { flex: 1 },
});