import { CartItem } from '@/components/cart-item';
import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useCart } from '@/context/cart-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatPrice } from '@/lib/format-price';
import { sdk } from '@/lib/sdk'; // Make sure to import sdk
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View, Alert, ActivityIndicator } from 'react-native';

export default function CartScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  
  // 1. Add refreshCart to destructuring
  const { cart, updateItemQuantity, removeItem, loading, refreshCart } = useCart();

  // 2. Local state for the promo code input
  const [promoCode, setPromoCode] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);

  const isEmpty = !cart?.items || cart.items.length === 0;

  if (loading && !cart) {
    return <Loading message="Loading cart..." />;
  }

  // 3. Handler to apply the coupon
  const handleApplyCoupon = async () => {
    if (!promoCode.trim() || !cart) return;
    
    setApplyingPromo(true);
    try {
      // Update the cart with the discount code
      await sdk.store.cart.update(cart.id, {
        discounts: [{ code: promoCode }] 
      });
      
      // Refresh the cart to see the new totals
      await refreshCart();
      
      setPromoCode('');
      Alert.alert("Success", "Coupon applied successfully!");
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Invalid coupon code");
    } finally {
      setApplyingPromo(false);
    }
  };

  // 4. Handler to remove the coupon (Optional but recommended)
  const handleRemoveCoupon = async () => {
    if (!cart) return;
    setApplyingPromo(true);
    try {
        // Sending empty array removes discounts
        await sdk.store.cart.update(cart.id, { discounts: [] });
        await refreshCart();
    } catch (error) {
        console.error(error);
    } finally {
        setApplyingPromo(false);
    }
  };

  if (isEmpty) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Your cart is empty</Text>
        <Text style={[styles.emptyText, { color: colors.icon }]}>
          Add some products to get started
        </Text>
        <Button
          title="Browse Products"
          onPress={() => router.push('/')}
          style={styles.browseButton}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={cart.items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CartItem
            item={item}
            currencyCode={cart.currency_code}
            onUpdateQuantity={(quantity) => updateItemQuantity(item.id, quantity)}
            onRemove={() => removeItem(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
      />
      
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.icon + '30' }]}>
        
        {/* --- COUPON SECTION START --- */}
        <View style={styles.couponContainer}>
            <TextInput 
                style={[
                    styles.couponInput, 
                    { 
                        color: colors.text, 
                        borderColor: colors.border,
                        backgroundColor: colorScheme === 'dark' ? '#333' : '#f9f9f9'
                    }
                ]}
                placeholder="Enter promo code"
                placeholderTextColor={colors.icon}
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
            />
            <Button 
                title={applyingPromo ? "" : "Apply"}
                onPress={handleApplyCoupon}
                style={styles.applyButton}
                disabled={applyingPromo || !promoCode}
                variant="secondary" // Use a secondary style if available, or default
            >
                {applyingPromo && <ActivityIndicator color={colors.text} size="small" />}
            </Button>
        </View>

        {/* Show applied discounts */}
        {cart.discounts && cart.discounts.length > 0 && (
            <View style={styles.appliedDiscountRow}>
                 <Text style={{ color: 'green', fontSize: 14 }}>
                    Code: {cart.discounts[0].code} applied
                 </Text>
                 <Text 
                    onPress={handleRemoveCoupon}
                    style={{ color: 'red', fontSize: 12, textDecorationLine: 'underline' }}>
                    Remove
                 </Text>
            </View>
        )}
        {/* --- COUPON SECTION END --- */}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>
              {formatPrice(cart.item_subtotal, cart.currency_code)}
            </Text>
          </View>

          {/* Display Discount Total if it exists */}
          {cart.discount_total > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: 'green' }]}>Discount</Text>
              <Text style={[styles.totalValue, { color: 'green' }]}>
                -{formatPrice(cart.discount_total, cart.currency_code)}
              </Text>
            </View>
          )}

          {cart.tax_total !== undefined && cart.tax_total > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Tax</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>
                {formatPrice(cart.tax_total, cart.currency_code)}
              </Text>
            </View>
          )}
          {cart.shipping_total !== undefined && cart.shipping_total > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Shipping</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>
                {formatPrice(cart.shipping_total, cart.currency_code)}
              </Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.grandTotalValue, { color: colors.tint }]}>
              {formatPrice(cart.total, cart.currency_code)}
            </Text>
          </View>
        </View>
        <Button
          title="Proceed to Checkout"
          onPress={() => router.push("/checkout")}
          loading={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  browseButton: {
    minWidth: 200,
  },
  listContent: {
    paddingBottom: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  // Coupon Styles
  couponContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  couponInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  applyButton: {
    width: 100,
  },
  appliedDiscountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  // End Coupon Styles
  totals: {
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
});