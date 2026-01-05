import { CartItem } from '@/components/cart-item';
import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useCart } from '@/context/cart-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatPrice } from '@/lib/format-price';
import { sdk } from '@/lib/sdk'; // 1. Import SDK
import { useRouter } from 'expo-router';
import React, { useState } from 'react'; // 2. Import useState
import { FlatList, StyleSheet, Text, View, TextInput, Alert, ActivityIndicator, TouchableOpacity } from 'react-native'; // 3. Add UI imports

export default function CartScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  
  // 4. Get refreshCart to update totals
  const { cart, updateItemQuantity, removeItem, loading, refreshCart } = useCart();

  // 5. Local state for coupon input
  const [promoCode, setPromoCode] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);

  const isEmpty = !cart?.items || cart.items.length === 0;

  if (loading && !cart) {
    return <Loading message="Loading cart..." />;
  }

  // --- COUPON LOGIC START ---
  const handleApplyCoupon = async () => {
    if (!promoCode.trim() || !cart) return;
    
    setApplyingPromo(true);
    try {
      // Medusa V2: Use 'promo_codes' array
      await sdk.store.cart.update(cart.id, {
        promo_codes: [promoCode] 
      });
      
      await refreshCart(); // Refresh to see the new totals
      setPromoCode('');
      Alert.alert("Success", "Coupon applied successfully!");
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Invalid coupon code");
    } finally {
      setApplyingPromo(false);
    }
  };

  const handleRemoveCoupon = async (codeToRemove: string) => {
    if (!cart) return;
    setApplyingPromo(true);
    try {
        // Medusa V2: We update the list by removing the specific code
        const currentCodes = cart.promotions?.map(p => p.code) || [];
        const newCodes = currentCodes.filter(c => c !== codeToRemove);

        await sdk.store.cart.update(cart.id, { 
            promo_codes: newCodes 
        });
        await refreshCart();
    } catch (error: any) {
        console.error(error);
        Alert.alert("Error", "Failed to remove coupon");
    } finally {
        setApplyingPromo(false);
    }
  };
  // --- COUPON LOGIC END ---

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
        
        {/* --- COUPON UI SECTION START --- */}
        <View style={styles.couponContainer}>
            <View style={styles.inputRow}>
                <TextInput 
                    style={[
                        styles.couponInput, 
                        { 
                            color: colors.text, 
                            borderColor: colors.border,
                            backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7'
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
                    variant="secondary"
                >
                    {applyingPromo && <ActivityIndicator color={colors.text} size="small" />}
                </Button>
            </View>

            {/* List Applied Promotions */}
            {cart.promotions && cart.promotions.length > 0 && (
                <View style={styles.promotionsList}>
                    {cart.promotions.map((promo) => (
                        <View key={promo.id} style={styles.promoItem}>
                            <Text style={{ color: 'green', fontSize: 13, fontWeight: '500' }}>
                                ✓ {promo.code} applied
                            </Text>
                            <TouchableOpacity onPress={() => handleRemoveCoupon(promo.code!)}>
                                <Text style={{ color: '#FF3B30', fontSize: 12 }}>Remove</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
        </View>
        {/* --- COUPON UI SECTION END --- */}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>
              {formatPrice(cart.item_subtotal, cart.currency_code)}
            </Text>
          </View>

          {/* Discount Row */}
          {(cart.discount_total || 0) > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: 'green' }]}>Discount</Text>
              <Text style={[styles.totalValue, { color: 'green' }]}>
                -{formatPrice(cart.discount_total || 0, cart.currency_code)}
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
  // Added Coupon Styles
  couponContainer: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  couponInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  applyButton: {
    width: 80,
    height: 44,
  },
  promotionsList: {
    marginTop: 8,
  },
  promoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
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