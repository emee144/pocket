// WalletScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, Platform } from 'react-native';

export default function WalletScreen() {
  const [connectedWallet, setConnectedWallet] = useState(null);

  const wallets = [
    { name: 'Trust Wallet', link: 'trust://' },
    { name: 'Pocket', link: 'pocket://' },
    { name: 'MetaMask', link: 'metamask://' },
  ];

  const openWallet = async (walletName, deepLink) => {
    try {
      const supported = await Linking.canOpenURL(deepLink);
      if (supported) {
        await Linking.openURL(deepLink);
        setConnectedWallet(walletName);
        Alert.alert(walletName, 'Opening wallet app...');
      } else {
        Alert.alert(
          `${walletName} not installed`,
          `Please install ${walletName} to continue.`
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect Your Wallet</Text>

      {connectedWallet ? (
        <Text style={styles.connectedText}>
          Connected Wallet: {connectedWallet}
        </Text>
      ) : (
        wallets.map((wallet, index) => (
          <TouchableOpacity
            key={index}
            style={styles.button}
            onPress={() => openWallet(wallet.name, wallet.link)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Connect {wallet.name}</Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const COLORS = {
  primary: 'rgb(0, 255, 204)',
  buttonBg: '#1f1f2e',
  connected: '#0f0',
  background: '#121212',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  title: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.buttonBg,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 5,
      },
    }),
  },
  buttonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  connectedText: {
    color: COLORS.connected,
    fontSize: 18,
    marginTop: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
