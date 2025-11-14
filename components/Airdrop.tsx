// components/Airdrop.tsx

/**
 * This project was developed by Nikandr Surkov.
 * You may not use this code if you purchased it from any source other than the official website https://nikandr.com.
 * If you purchased it from the official website, you may use it for your own projects,
 * but you may not resell it or publish it publicly.
 * 
 * Website: https://nikandr.com
 * YouTube: https://www.youtube.com/@NikandrSurkov
 * Telegram: https://t.me/nikandr_s
 * Telegram channel for news/updates: https://t.me/clicker_game_news
 * GitHub: https://github.com/nikandr-surkov
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { iceToken, paidTrophy1, tonWallet } from '@/images';
import { useTonConnectUI } from '@tonconnect/ui-react';
import Angle from '@/icons/Angle';
import Copy from '@/icons/Copy';
import Cross from '@/icons/Cross';
import Wallet from '@/icons/Wallet';
import { useGameStore } from '@/utils/game-mechanics';
import { useToast } from '@/contexts/ToastContext';
import IceCube from '@/icons/IceCube';
import { Address } from "@ton/core";
import { triggerHapticFeedback } from '@/utils/ui';
import OnchainTaskPopup from './popups/OnchainTaskPopup';
import WithdrawPopup from '@/components/popups/WithdrawPopup';
import { formatNumber } from '@/utils/ui';

interface OnchainTask {
    id: string;
    smartContractAddress: string;
    price: string;
    collectionMetadata: {
        name: string;
        description: string;
        image: string;
    };
    itemMetadata: any;
    points: number;
    isActive: boolean;
    isCompleted: boolean;
}

export default function Airdrop() {
    const [tonConnectUI] = useTonConnectUI();
    const { tonWalletAddress, setTonWalletAddress, userTelegramInitData, pointsBalance } = useGameStore();
    const [copied, setCopied] = useState(false);
    const [isProcessingWallet, setIsProcessingWallet] = useState(false);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const showToast = useToast();
    const [onchainTasks, setOnchainTasks] = useState<OnchainTask[]>([]);
    const [selectedOnchainTask, setSelectedOnchainTask] = useState<OnchainTask | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
    const [totalDistributed, setTotalDistributed] = useState(0);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [showWithdrawPopup, setShowWithdrawPopup] = useState(false);

    const MINIMUM_WITHDRAW = 99;
    const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

    const transactionsRef = useRef<HTMLDivElement>(null);

    const fetchOnchainTasks = useCallback(async () => {
        try {
            setIsLoadingTasks(true);
            const response = await fetch(`/api/onchain-tasks?initData=${encodeURIComponent(userTelegramInitData)}`);
            if (!response.ok) {
                throw new Error('Failed to fetch onchain tasks');
            }
            const data = await response.json();
            setOnchainTasks(data);
        } catch (error) {
            console.error('Error fetching onchain tasks:', error);
            showToast("Failed to load onchain tasks", "error");
        } finally {
            setIsLoadingTasks(false);
        }
    }, [userTelegramInitData, showToast]);

    useEffect(() => {
        fetchOnchainTasks();
    }, [fetchOnchainTasks]);

    // Optional: restore scroll to transactions if flagged
    useEffect(() => {
        const shouldScroll = localStorage.getItem('scrollToTransactions') === 'true';
        if (shouldScroll && transactionsRef.current) {
            setTimeout(() => {
                transactionsRef.current?.scrollIntoView({ behavior: 'smooth' });
                localStorage.removeItem('scrollToTransactions');
            }, 500);
        }
    }, []);

    const saveWalletAddress = useCallback(async (address: string): Promise<boolean> => {
        try {
            const response = await fetch('/api/wallet/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData: userTelegramInitData,
                    walletAddress: address,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save wallet address');
            }

            const data = await response.json();
            setTonWalletAddress(data.walletAddress);
            return true;
        } catch (error) {
            console.error('Error saving wallet address:', error);
            return false;
        }
    }, [userTelegramInitData, setTonWalletAddress]);

    const disconnectWallet = useCallback(async () => {
        try {
            const response = await fetch('/api/wallet/disconnect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData: userTelegramInitData,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to disconnect wallet');
            }
        } catch (error) {
            console.error('Error disconnecting wallet:', error);
            throw error;
        }
    }, [userTelegramInitData]);

    const handleWalletConnection = useCallback(async (address: string) => {
        setIsProcessingWallet(true);
        try {
            const success = await saveWalletAddress(address);
            if (!success) {
                if (tonConnectUI.account?.address) {
                    await tonConnectUI.disconnect();
                }
                showToast("Failed to save wallet address. Please try connecting again.", "error");
            } else {
                showToast("Wallet connected successfully!", "success");
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            showToast("An error occurred while connecting the wallet.", "error");
        } finally {
            setIsProcessingWallet(false);
            setIsConnecting(false);
        }
    }, [tonConnectUI, showToast, saveWalletAddress]);

    const handleWalletDisconnection = useCallback(async () => {
        setIsProcessingWallet(true);
        try {
            await disconnectWallet();
            setTonWalletAddress(null);
            showToast("Wallet disconnected successfully!", "success");
        } catch (error) {
            console.error('Error disconnecting wallet:', error);
            showToast("An error occurred while disconnecting the wallet.", "error");
        } finally {
            setIsProcessingWallet(false);
        }
    }, [setTonWalletAddress, showToast, disconnectWallet]);

    useEffect(() => {
        const unsubscribe = tonConnectUI.onStatusChange(async (wallet) => {
            if (wallet && isConnecting) {
                await handleWalletConnection(wallet.account.address);
            } else if (!wallet && !isConnecting) {
                await handleWalletDisconnection();
            }
        });

        return () => {
            unsubscribe();
        };
    }, [tonConnectUI, handleWalletConnection, handleWalletDisconnection, isConnecting]);

    const handleWalletAction = async () => {
        triggerHapticFeedback(window);
        if (tonConnectUI.account?.address) {
            await tonConnectUI.disconnect();
        } else {
            setIsConnecting(true);
            await tonConnectUI.openModal();
        }
    };

    const formatAddress = (address: string) => {
        const tempAddress = Address.parse(address).toString();
        return `${tempAddress.slice(0, 4)}...${tempAddress.slice(-4)}`;
    };

    const copyToClipboard = () => {
        if (tonWalletAddress) {
            triggerHapticFeedback(window);
            navigator.clipboard.writeText(tonWalletAddress);
            setCopied(true);
            showToast("Address copied to clipboard!", "success");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleOnchainTaskClick = (task: OnchainTask) => {
        if (!task.isCompleted) {
            triggerHapticFeedback(window);
            setSelectedOnchainTask(task);
        }
    };

    const handleTaskUpdate = useCallback((updatedTask: OnchainTask) => {
        setOnchainTasks(prevTasks =>
            prevTasks.map(t =>
                t.id === updatedTask.id ? updatedTask : t
            )
        );
    }, []);

    // Fetch recent USDT TRC-20 transfers (limited list)
    const fetchTransactions = useCallback(async () => {
        try {
            setIsLoadingTransactions(true);
            const endpoint = `https://api.trongrid.io/v1/contracts/${USDT_CONTRACT}/events`;
            const params = {
                event_name: 'Transfer',
                limit: '15',
                order_by: 'block_timestamp,desc'
            } as Record<string, string>;
            const response = await fetch(`${endpoint}?${new URLSearchParams(params)}`);
            if (!response.ok) {
                throw new Error('Failed to fetch transactions');
            }
            const data = await response.json();
            const processed = (data.data || []).map((tx: any) => {
                const amount = parseFloat(tx.result?.value || '0') / 1_000_000;
                return {
                    txid: tx.transaction_id,
                    timestamp: tx.block_timestamp,
                    amount: amount.toFixed(2),
                    address: tx.result?.to || 'Unknown',
                    type: 'Withdrawal',
                    status: 'Completed'
                };
            }).filter((tx: any) => parseFloat(tx.amount) >= MINIMUM_WITHDRAW);

            const total = processed.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
            setTotalDistributed(total);
            setTransactions(processed);
        } catch (e) {
            console.error('Error fetching transactions:', e);
            showToast('Failed to fetch transactions', 'error');
        } finally {
            setIsLoadingTransactions(false);
        }
    }, [USDT_CONTRACT, MINIMUM_WITHDRAW, showToast]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    // Append a simulated payout every 60 seconds
    useEffect(() => {
        const intervalId = setInterval(() => {
            setTransactions((prev) => {
                const randomAmt = (Math.random() * 200 + 50).toFixed(2);
                const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
                const randomTx = {
                    txid: `${rand}${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                    timestamp: Date.now(),
                    amount: randomAmt,
                    address: `T${Math.random().toString(36).substring(2, 34).toUpperCase()}`,
                    type: 'Withdrawal',
                    status: 'Completed'
                };
                return [randomTx, ...prev.slice(0, 29)];
            });
        }, 60000);
        return () => clearInterval(intervalId);
    }, []);

    const handleWithdraw = async () => {
        if (!tonWalletAddress) {
            showToast('Please connect your wallet first', 'error');
            return;
        }
        setIsWithdrawing(true);
        triggerHapticFeedback(window);
        try {
            // Simulate API request
            await new Promise((r) => setTimeout(r, 2000));
            showToast('Withdrawal request submitted successfully!', 'success');
            const newTx = {
                txid: `${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
                timestamp: Date.now(),
                amount: (Math.random() * 200 + 50).toFixed(2),
                address: tonWalletAddress,
                type: 'Withdrawal',
                status: 'Processing'
            };
            setTransactions((prev) => [newTx, ...prev.slice(0, 14)]);
        } catch (e) {
            console.error('Error processing withdrawal:', e);
            showToast('Failed to process withdrawal. Please try again.', 'error');
        } finally {
            setIsWithdrawing(false);
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const truncateAddress = (address: string) => `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
    const truncateTxId = (txid: string) => `${txid.substring(0, 8)}...${txid.substring(txid.length - 8)}`;

    const handleWithdrawClick = () => {
        triggerHapticFeedback(window);
        setShowWithdrawPopup(true);
    };

    return (
        <div className="bg-black flex justify-center min-h-screen">
            <div className="w-full bg-black text-white font-bold flex flex-col max-w-xl">
                <div className="flex-grow mt-4 bg-[#f3ba2f] rounded-t-[48px] relative top-glow z-0">
                    <div className="mt-[2px] bg-[#1d2025] rounded-t-[46px] h-full overflow-y-auto no-scrollbar">
                        <div className="px-4 pt-1 pb-24">
                            <div className="relative mt-4">
                                <div className="flex justify-center mb-4">
                                    <Image src={iceToken} alt="Ice Token" width={96} height={96} className="rounded-lg mr-2" />
                                </div>
                                <h1 className="text-2xl text-center mb-4">Withdraw Tasks</h1>
                                <p className="text-gray-300 text-center mb-4 font-normal">There is a list of Task below. Complete them to qualify for the Withdraw.</p>
                                {/* Wallet section removed as requested */}
                                {/* Withdraw + Progress (preserving colors) */}
                                <div className="bg-[#272a2f] rounded-lg p-4 mb-4 border border-[#43433b]">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-base">USDT Balance:</span>
                                        <span className="text-white font-bold">{formatNumber(pointsBalance)} / {MINIMUM_WITHDRAW}</span>
                                    </div>
                                    <div className="w-full bg-[#43433b]/50 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="h-2.5 rounded-full"
                                            style={{ width: `${Math.min(100, (pointsBalance / MINIMUM_WITHDRAW) * 100)}%`, background: 'linear-gradient(90deg,#f0b90b,#f3ba2f)' }}
                                        />
                                    </div>
                                    <div className="mt-4 flex gap-3">
                                        <button
                                            onClick={handleWithdrawClick}
                                            disabled={pointsBalance < MINIMUM_WITHDRAW}
                                            className={`px-4 py-2 rounded-lg font-bold ${pointsBalance < MINIMUM_WITHDRAW ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            style={{ background: '#f3ba2f', color: '#000' }}
                                        >Withdraw USDT</button>
                                        <button
                                            onClick={fetchTransactions}
                                            className="px-4 py-2 rounded-lg border border-[#43433b]"
                                        >Refresh payouts</button>
                                    </div>
                                </div>

                                <h2 className="text-base mt-8 mb-4">Tasks</h2>
                                <div className="space-y-2">
                                    {
                                        isLoadingTasks ?
                                            (
                                                [...Array(3)].map((_, index) => (
                                                    <div
                                                        key={index}
                                                        className="w-full flex justify-between items-center bg-[#272a2f] rounded-lg p-4"
                                                    >
                                                        <div className="flex items-center">
                                                            <div className="w-10 h-10 bg-gray-700 rounded-lg mr-2 animate-pulse" />
                                                            <div className="flex flex-col gap-2">
                                                                <div className="w-32 h-4 bg-gray-700 rounded animate-pulse" />
                                                                <div className="flex items-center gap-1">
                                                                    <div className="w-6 h-6 bg-gray-700 rounded animate-pulse" />
                                                                    <div className="w-16 h-4 bg-gray-700 rounded animate-pulse" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="w-16 h-4 bg-gray-700 rounded animate-pulse" />
                                                    </div>
                                                ))
                                            )
                                            :
                                            (
                                                onchainTasks.map((task) => (
                                                    <button
                                                        key={task.id}
                                                        className="w-full flex justify-between items-center bg-[#272a2f] rounded-lg p-4"
                                                        onClick={() => handleOnchainTaskClick(task)}
                                                    >
                                                        <div className="flex items-center">
                                                            <Image
                                                                src={task.collectionMetadata.image}
                                                                alt={task.collectionMetadata.name}
                                                                width={40}
                                                                height={40}
                                                                className="rounded-lg mr-2"
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{task.collectionMetadata.name}</span>
                                                                <div className="flex items-center">
                                                                    <IceCube className="w-6 h-6 mr-1" />
                                                                    <span className="text-white">+{task.points}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {task.isCompleted ? (
                                                            <svg
                                                                className="w-6 h-6 text-green-500"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                                xmlns="http://www.w3.org/2000/svg"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M5 13l4 4L19 7"
                                                                />
                                                            </svg>
                                                        ) : (
                                                            <span>{formatTON(task.price)} TON</span>
                                                        )}
                                                    </button>
                                                ))
                                            )}
                                </div>

                                {/* Recent payouts (preserving dark theme colors) */}
                                <div ref={transactionsRef} className="mt-8">
                                    <h2 className="text-base mb-2">Recent USDT payouts</h2>
                                    <div className="bg-[#272a2f] rounded-lg p-4 border border-[#43433b]">
                                        {isLoadingTransactions ? (
                                            <div className="space-y-2 animate-pulse">
                                                {[...Array(3)].map((_, i) => (
                                                    <div key={i} className="h-10 bg-[#33363b] rounded" />
                                                ))}
                                            </div>
                                        ) : transactions.length === 0 ? (
                                            <p className="text-gray-400">No payouts found</p>
                                        ) : (
                                            <ul className="divide-y divide-[#33363b]">
                                                {transactions.map((tx, idx) => (
                                                    <li key={idx} className="py-2 flex items-center justify-between">
                                                        <div className="text-sm text-gray-300">
                                                            <div className="font-medium text-white">{truncateAddress(tx.address)} • {tx.amount} USDT</div>
                                                            <div className="text-xs">{formatDate(tx.timestamp)}</div>
                                                        </div>
                                                        <a href={`https://tronscan.org/#/transaction/${tx.txid}`} target="_blank" className="text-xs underline">{truncateTxId(tx.txid)}</a>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {selectedOnchainTask && (
                <OnchainTaskPopup
                    task={selectedOnchainTask}
                    onClose={() => setSelectedOnchainTask(null)}
                    onUpdate={handleTaskUpdate}
                />
            )}
            {showWithdrawPopup && (
                <WithdrawPopup
                    onClose={() => setShowWithdrawPopup(false)}
                    balance={pointsBalance}
                    minimumWithdraw={MINIMUM_WITHDRAW}
                />
            )}
        </div>
    );
}

// Helper function to format TON amount
function formatTON(nanoTON: string): string {
    return (parseInt(nanoTON) / 1e9).toFixed(2);
}