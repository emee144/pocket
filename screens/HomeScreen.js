// HomeScreen.js
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { supabase } from '../supabase';
import { ethers } from 'ethers';
import axios from 'axios';

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) navigation.replace('Auth');
      else setUser(data.user);
      setLoading(false);
    };
    fetchUser();
  }, []);

  const fetchWithRetry = async (url, retries = 3, delay = 1000, headers = {}) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await axios.get(url, { headers });
        return res;
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  };

  const fetchBalances = async () => {
    if (!cryptoAddress) {
      Alert.alert('Invalid Address', 'Please enter a crypto address.');
      return;
    }

    setFetching(true);
    let results = [];

    try {
      // Ethereum
      if (cryptoAddress.startsWith('0x') && ethers.isAddress(cryptoAddress)) {
        const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');

        // ETH balance
        const ethWei = await provider.getBalance(cryptoAddress);
        const eth = parseFloat(ethers.formatEther(ethWei)).toFixed(4);
        if (parseFloat(eth) > 0) results.push({ symbol: 'ETH', balance: eth });

        // ERC-20 tokens (via Etherscan API)
        const etherscanApiKey = 'YOUR_ETHERSCAN_FREE_KEY';
        const erc20Url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokentx&address=${cryptoAddress}&sort=desc&apikey=${etherscanApiKey}`;
        const ercData = await fetchWithRetry(erc20Url);

        if (ercData.data.status === '1' && ercData.data.result?.length > 0) {
          const tokenMap = {};
          ercData.data.result.forEach(tx => {
            const decimals = tx.tokenDecimal ? parseInt(tx.tokenDecimal) : 0;
            const value = parseFloat(tx.value) / Math.pow(10, decimals);
            if (!tokenMap[tx.tokenSymbol]) tokenMap[tx.tokenSymbol] = 0;
            tokenMap[tx.tokenSymbol] += value;
          });

          Object.keys(tokenMap).forEach(symbol => {
            if (tokenMap[symbol] > 0)
              results.push({ symbol, balance: tokenMap[symbol].toFixed(4) });
          });
        }
      }
      // Tron
      else if (cryptoAddress.startsWith('T')) {
        const tronApiKey = 'YOUR_TRON_API_KEY'; // optional
        try {
          const trxResp = await fetchWithRetry(
            `https://api.trongrid.io/v1/accounts/${cryptoAddress}`,
            3,
            1000,
            { 'TRON-PRO-API-KEY': tronApiKey }
          );

          const accountData = trxResp.data?.data?.[0];
          const trxBalance = accountData?.balance
            ? (accountData.balance / 1e6).toFixed(4)
            : 0;

          if (parseFloat(trxBalance) > 0)
            results.push({ symbol: 'TRX', balance: trxBalance });

          if (accountData?.trc20 && Array.isArray(accountData.trc20)) {
            for (const tokenObj of accountData.trc20) {
              const [contract, balanceStr] = Object.entries(tokenObj)[0];
              const balance = parseFloat(balanceStr) / 1e6;
              if (balance > 0) {
                const tokenInfo = await fetchWithRetry(
                  `https://apilist.tronscan.org/api/token_trc20?contract=${contract}`
                );
                const symbol = tokenInfo.data?.trc20_tokens?.[0]?.symbol || 'TRC20';
                results.push({ symbol, balance: balance.toFixed(4) });
              }
            }
          }
        } catch (err) {
          console.log(`TronGrid failed (${err.response?.status})`);
          const scanResp = await fetchWithRetry(
            `https://apilist.tronscanapi.com/api/account?address=${cryptoAddress}`
          );
          const trxBal =
            scanResp.data?.balance ? (scanResp.data.balance / 1e6).toFixed(4) : 0;
          if (parseFloat(trxBal) > 0) results.push({ symbol: 'TRX', balance: trxBal });
        }
      } else {
        Alert.alert('Invalid Address', 'Address not recognized.');
      }

      // Fetch USD prices via CoinGecko
      const idMap = {
        eth: 'ethereum',
        trx: 'tron',
        usdt: 'tether',
        usdc: 'usd-coin',
        bnb: 'binancecoin',
        busd: 'binance-usd',
        dai: 'dai',
      };

      const ids = results
        .map(b => idMap[b.symbol.toLowerCase()] || b.symbol.toLowerCase())
        .join(',');

      const coingeckoResp = await fetchWithRetry(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
      );

      const balancesWithUsd = results.map(b => {
        const id = idMap[b.symbol.toLowerCase()] || b.symbol.toLowerCase();
        const price = coingeckoResp.data[id]?.usd || 0;
        return { ...b, usd: (b.balance * price).toFixed(2) };
      });

      balancesWithUsd.sort((a, b) => parseFloat(b.usd) - parseFloat(a.usd));
      setBalances(balancesWithUsd);
    } catch (err) {
      const url = err.config?.url || 'Unknown URL';
      const status = err.response?.status || 'No status';
      const data = JSON.stringify(err.response?.data || {}, null, 2);

      console.log('API Request failed:', url, status, data);
      Alert.alert('Request Error', `URL: ${url}\nStatus: ${status}`);
    } finally {
      setFetching(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Error', error.message);
    else navigation.replace('Auth');
  };

  if (loading)
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00ffcc" />
      </View>
    );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.logo}>ChainPocket</Text>
      <Text style={styles.subtitle}>Welcome, {user?.email.split('@')[0]}</Text>

      <View style={styles.inputCard}>
        <Text style={styles.inputLabel}>Enter Crypto Address</Text>
        <TextInput
          style={styles.input}
          placeholder="0x... / T..."
          placeholderTextColor="#666"
          value={cryptoAddress}
          onChangeText={setCryptoAddress}
        />
        <TouchableOpacity style={styles.fetchButton} onPress={fetchBalances}>
          {fetching ? (
            <ActivityIndicator color="#00ffcc" />
          ) : (
            <Text style={styles.fetchText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {balances.length === 0 && !fetching ? (
        <Text style={{ color: '#999', marginTop: 20 }}>
          No assets found for this address.
        </Text>
      ) : (
        balances.map((b, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.cardTitle}>{b.symbol}</Text>
            <Text style={styles.value}>{b.balance}</Text>
            <Text style={styles.subValue}>≈ ${b.usd}</Text>
          </View>
        ))
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
    padding: 25,
  },
  logo: { color: '#00ffcc', fontSize: 32, fontWeight: 'bold', marginBottom: 6 },
  subtitle: { color: '#ccc', fontSize: 16, marginBottom: 25 },
  inputCard: {
    width: '100%',
    backgroundColor: '#14141f',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
  },
  inputLabel: { color: '#00ffcc', marginBottom: 8, fontWeight: 'bold' },
  input: {
    backgroundColor: '#1f1f2e',
    borderRadius: 8,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 15,
  },
  fetchButton: {
    backgroundColor: '#00ffcc20',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  fetchText: { color: '#00ffcc', fontWeight: 'bold' },
  card: {
    backgroundColor: '#14141f',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#00ffcc',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    marginBottom: 10,
  },
  cardTitle: {
    color: '#00ffcc',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  value: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  subValue: { color: '#ccc', fontSize: 16 },
  logoutButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginTop: 40,
  },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
