"use client";

import { useEffect, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModeSwitcher } from "@/components/mode-switcher";

interface Trade {
  coin: string;
  side: string;
  px: string;
  sz: string;
  hash: string;
  time: number;
  tid: number;
  users: [string, string];
}

const COINS = [
  { value: "BTC", label: "Bitcoin (BTC)" },
  { value: "ETH", label: "Ethereum (ETH)" },
  { value: "SOL", label: "Solana (SOL)" },
  { value: "HYPE", label: "Hyperliquid (HYPE)" },
  { value: "PURR", label: "Purr (PURR)" },
  { value: "ARB", label: "Arbitrum (ARB)" },
  { value: "DOGE", label: "Dogecoin (DOGE)" },
  { value: "AVAX", label: "Avalanche (AVAX)" },
  { value: "MATIC", label: "Polygon (MATIC)" },
  { value: "ATOM", label: "Cosmos (ATOM)" },
];

export default function HypeDashboard() {
  const [selectedCoin, setSelectedCoin] = useState<string>("HYPE");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<string>("0");
  const [previousPrice, setPreviousPrice] = useState<string>("0");
  const [priceChange, setPriceChange] = useState<number>(0);
  const [stats, setStats] = useState({
    buys: 0,
    sells: 0,
    volume: 0,
    high: 0,
    low: 0,
  });
  const [recentPrices, setRecentPrices] = useState<
    Array<{ price: number; tid: number; time: number }>
  >([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setTrades([]);
    setCurrentPrice("0");
    setPreviousPrice("0");
    setPriceChange(0);
    setRecentPrices([]);
    setStats({ buys: 0, sells: 0, volume: 0, high: 0, low: 0 });

    const ws = new WebSocket("wss://api.hyperliquid.xyz/ws");
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(
        JSON.stringify({
          method: "subscribe",
          subscription: {
            type: "trades",
            coin: selectedCoin,
          },
        }),
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.channel === "trades" && data.data) {
        const newTrades = data.data as Trade[];

        setTrades((prev) => {
          const updated = [...newTrades, ...prev].slice(0, 100);
          return updated;
        });

        if (newTrades.length > 0) {
          const latestPrice = newTrades[0].px;
          setCurrentPrice((prev) => {
            setPreviousPrice(prev);
            return latestPrice;
          });

          setRecentPrices((prev) => {
            const updated = [
              ...prev,
              {
                price: Number.parseFloat(latestPrice),
                tid: newTrades[0].tid,
                time: newTrades[0].time,
              },
            ];
            return updated.slice(-20);
          });
        }
      }
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            method: "unsubscribe",
            subscription: {
              type: "trades",
              coin: selectedCoin,
            },
          }),
        );
      }
      ws.close();
    };
  }, [selectedCoin]);

  useEffect(() => {
    const buys = trades.filter((t) => t.side === "B").length;
    const sells = trades.filter((t) => t.side === "A").length;
    const volume = trades.reduce(
      (sum, t) => sum + Number.parseFloat(t.px) * Number.parseFloat(t.sz),
      0,
    );

    const prices = trades.map((t) => Number.parseFloat(t.px));
    const high = prices.length > 0 ? Math.max(...prices) : 0;
    const low = prices.length > 0 ? Math.min(...prices) : 0;

    setStats({ buys, sells, volume, high, low });

    if (trades.length > 0 && previousPrice !== "0") {
      const change =
        ((Number.parseFloat(currentPrice) - Number.parseFloat(previousPrice)) /
          Number.parseFloat(previousPrice)) *
        100;
      setPriceChange(change);
    }
  }, [trades, currentPrice, previousPrice]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const buyPressure =
    stats.buys + stats.sells > 0
      ? (stats.buys / (stats.buys + stats.sells)) * 100
      : 50;
  const sellPressure = 100 - buyPressure;

  return (
    <div className="min-h-screen font-mono p-6 relative">
      {/* Corner brackets */}
      <div className="fixed top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-muted" />
      <div className="fixed top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-muted" />
      <div className="fixed bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-muted" />
      <div className="fixed bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-muted" />

      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8 border-b pb-4">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl tracking-[0.3em]">
              {selectedCoin} TRADING OVERVIEW
            </h1>
            <ModeSwitcher />
          </div>
          <div className="flex justify-between items-end">
            <p className="text-sm text-muted-foreground">Last Update {formatDate()}</p>
            <Select value={selectedCoin} onValueChange={setSelectedCoin}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select coin" />
              </SelectTrigger>
              <SelectContent>
                {COINS.map((coin) => (
                  <SelectItem key={coin.value} value={coin.value}>
                    {coin.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Trade Statistics */}
          <div className="border border-border p-6">
            <h2 className="text-lg mb-6 border-b border-border pb-2">
              Trade Statistics
            </h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="border border-border p-4 text-center">
                <div className="text-3xl font-bold mb-2 text-green-500">
                  {stats.buys}
                </div>
                <div className="text-xs text-muted-foreground">Buy Orders</div>
              </div>
              <div className="border border-border p-4 text-center">
                <div className="text-3xl font-bold mb-2 text-destructive">
                  {stats.sells}
                </div>
                <div className="text-xs text-muted-foreground">Sell Orders</div>
              </div>
              <div className="border border-border p-4 text-center">
                <div className="text-3xl font-bold mb-2">{trades.length}</div>
                <div className="text-xs text-muted-foreground">Total Trades</div>
              </div>
            </div>

            {/* Current Price */}
            <div className="border border-border p-4 mb-4">
              <div className="text-xs text-muted-foreground mb-2">Current Price</div>
              <div className="text-3xl font-bold">${currentPrice}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {selectedCoin}/USD
              </div>
            </div>

            {/* Volume */}
            <div className="border border-border p-4">
              <div className="text-xs text-muted-foreground mb-2">Total Volume</div>
              <div className="text-2xl font-bold">
                ${stats.volume.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Last {trades.length} Trades
              </div>
            </div>
          </div>

          <div className="border border-border p-6">
            <h2 className="text-lg mb-6 border-b border-border pb-2">
              Market Overview
            </h2>

            {/* Large Price Display */}
            <div className="border border-border p-8 mb-6 text-center bg-background/50">
              <div className="text-xs text-muted-foreground mb-2 tracking-wider">
                CURRENT PRICE
              </div>
              <div className="text-6xl font-bold mb-3 tracking-tight">
                ${currentPrice}
              </div>
              <div
                className={`text-xl ${priceChange >= 0 ? "text-green-500" : "text-destructive"}`}
              >
                {priceChange >= 0 ? "▲" : "▼"}{" "}
                {Math.abs(priceChange).toFixed(2)}%
              </div>
            </div>

            {/* 24h Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="border border-border p-4">
                <div className="text-xs text-muted-foreground mb-2">24H HIGH</div>
                <div className="text-2xl font-bold text-green-500">
                  ${stats.high.toFixed(4)}
                </div>
              </div>
              <div className="border border-border p-4">
                <div className="text-xs text-muted-foreground mb-2">24H LOW</div>
                <div className="text-2xl font-bold text-destructive">
                  ${stats.low.toFixed(4)}
                </div>
              </div>
            </div>

            {/* Buy/Sell Pressure */}
            <div className="border border-border p-4">
              <div className="text-xs text-muted-foreground mb-3">MARKET PRESSURE</div>
              <div className="flex gap-2 mb-2">
                <div
                  className="bg-green-500/30 border border-green-500 h-8 flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={{ width: `${buyPressure}%` }}
                >
                  {buyPressure.toFixed(0)}%
                </div>
                <div
                  className="bg-destructive/30 border border-destructive h-8 flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={{ width: `${sellPressure}%` }}
                >
                  {sellPressure.toFixed(0)}%
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>BUY PRESSURE</span>
                <span>SELL PRESSURE</span>
              </div>
            </div>

            {/* Mini Sparkline */}
            {recentPrices.length > 1 && (
              <div className="border border-border p-4 mt-4">
                <div className="text-xs text-muted-foreground mb-3">PRICE MOVEMENT</div>
                <div className="h-16 flex items-end gap-1">
                  {recentPrices.map((item, idx) => {
                    const prices = recentPrices.map((p) => p.price);
                    const maxPrice = Math.max(...prices);
                    const minPrice = Math.min(...prices);
                    const range = maxPrice - minPrice || 1;
                    const height = ((item.price - minPrice) / range) * 100;
                    const isUp =
                      idx > 0 && item.price >= recentPrices[idx - 1].price;

                    return (
                      <div
                        key={item.tid}
                        className={`flex-1 ${isUp ? "bg-green-500" : "bg-destructive"} transition-all duration-300`}
                        style={{ height: `${height}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Live Trade Feed */}
          <div className="border border-border p-6">
            <h2 className="text-lg mb-4 border-b border-border pb-2">
              Live Trade Feed
            </h2>

            {/* Connection Status */}
            <div className="mb-4 text-xs border border-border p-3 bg-background/50">
              <div className="text-muted-foreground">&gt; SYSTEM STATUS</div>
              <div className="mt-1">
                <span className="text-muted-foreground">&gt; CONNECTION: </span>
                <span
                  className={isConnected ? "text-green-500" : "text-destructive"}
                >
                  {isConnected ? "ACTIVE" : "DISCONNECTED"}
                </span>
              </div>
              <div className="mt-1 text-muted-foreground">
                &gt; MONITORING: {selectedCoin}/USD
              </div>
              <div className="mt-1 text-muted-foreground">
                &gt; TRADES: {trades.length}
              </div>
            </div>

            {/* Trade Feed */}
            <div className="space-y-3 max-h-[550px] overflow-y-auto">
              {trades.length === 0 ? (
                <div className="text-muted-foreground text-xs">
                  <div>&gt; Awaiting trade data...</div>
                  <div>&gt; Establishing connection...</div>
                </div>
              ) : (
                trades.slice(0, 20).map((trade, idx) => (
                  <div
                    key={`feed-${trade.tid}-${idx}`}
                    className="border border-border/30 p-3 bg-background/30 text-xs"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-muted-foreground">
                        #{trade.tid.toString().slice(-8)}
                      </span>
                      <span
                        className={
                          trade.side === "B"
                            ? "text-green-500 font-bold"
                            : "text-destructive font-bold"
                        }
                      >
                        {trade.side === "B" ? "BUY" : "SELL"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="text-foreground">${trade.px}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Size:</span>
                        <span className="text-foreground">
                          {Number.parseFloat(trade.sz).toFixed(4)}{" "}
                          {selectedCoin}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Value:</span>
                        <span className="text-foreground">
                          $
                          {(
                            Number.parseFloat(trade.px) *
                            Number.parseFloat(trade.sz)
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time:</span>
                        <span className="text-foreground/70">
                          {formatTime(trade.time)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
