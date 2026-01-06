import { sdk } from "@/lib/sdk";
import type { HttpTypes } from "@medusajs/types";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useCart } from "./cart-context";
import { Alert } from "react-native";

interface AuthContextType {
  customer: HttpTypes.StoreCustomer | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<HttpTypes.StoreCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const { refreshCart } = useCart();

  // Check if user is already logged in on app start
  useEffect(() => {
    async function checkSession() {
      try {
        const { customer } = await sdk.store.customer.retrieve();
        setCustomer(customer);
      } catch (error) {
        // Not logged in, that's fine
        setCustomer(null);
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      // 1. Authenticate with Medusa
      await sdk.auth.login("customer", "emailpass", {
        email,
        password: pass,
      });

      // 2. Fetch Customer Details
      const { customer } = await sdk.store.customer.retrieve();
      setCustomer(customer);

      // 3. Refresh Cart (Crucial: Attaches the cart to this new customer)
      await refreshCart(); 
      
      Alert.alert("Welcome back", `Logged in as ${customer.first_name}`);
    } catch (error: any) {
      console.error(error);
      throw new Error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await sdk.auth.logout();
      setCustomer(null);
      await refreshCart(); // Reset cart ownership
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ customer, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}