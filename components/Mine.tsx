// components/Mine.tsx

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

import { useState, useEffect, useRef, useCallback } from 'react';
import IceCubes from '@/icons/IceCubes';
import { useGameStore } from '@/utils/game-mechanics';
import TopInfoSection from '@/components/TopInfoSection';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';

const MINING_PLANS = [15, 25, 50, 100, 250, 500];
const USDT_DEPOSIT_ADDRESS = 'TUUSCpDpQdNjAe55q4WNX322VHoA8wbCfN';

interface MineProps {
    setCurrentView: (view: string) => void;
}

export default function Mine({ setCurrentView }: MineProps) {
    const showToast = useToast();

    const {
        userTelegramInitData,
        pointsBalance,
        setPointsBalance,
        incrementPoints,
        setPoints,
    } = useGameStore();
    const [purchasingPlan, setPurchasingPlan] = useState<number | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
    const [walletAddress, setWalletAddress] = useState<string>('');
    
    const previousPointsBalanceRef = useRef<number>(pointsBalance);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isCheckingRef = useRef(false);

    const handlePlanSelect = (planAmount: number) => {
        setSelectedPlan(planAmount);
    };

    const handleCopyAddress = () => {
        navigator.clipboard.writeText(USDT_DEPOSIT_ADDRESS);
        showToast('Address copied to clipboard!', 'success');
    };

    // Función para verificar y actualizar el balance desde el servidor
    const checkAndUpdateBalance = useCallback(async () => {
        if (!userTelegramInitData || isCheckingRef.current) return;

        isCheckingRef.current = true;
        try {
            const response = await fetch('/api/user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    telegramInitData: userTelegramInitData,
                }),
            });

            if (!response.ok) {
                console.error('Error fetching user data:', response.statusText);
                return;
            }

            const userData = await response.json();
            
            if (userData && userData.pointsBalance !== undefined) {
                // Obtener el balance actual del store usando el estado actual
                const currentBalance = previousPointsBalanceRef.current;
                const serverBalance = userData.pointsBalance;
                
                // Si el balance del servidor es mayor, significa que se agregaron puntos
                if (serverBalance > currentBalance) {
                    const pointsAdded = serverBalance - currentBalance;
                    console.log(`[Mine] Detected balance increase: ${pointsAdded} points added`);
                    
                    // Actualizar el store con los nuevos valores del servidor
                    setPointsBalance(serverBalance);
                    previousPointsBalanceRef.current = serverBalance; // Actualizar referencia
                    if (userData.points !== undefined) {
                        setPoints(userData.points);
                    }
                    
                    // Mostrar notificación si es un aumento significativo (probablemente de mining plan)
                    if (pointsAdded >= 30) { // 30 es el mínimo de los planes (15 * 2)
                        showToast(`✅ ${pointsAdded} USDT added to your account!`, 'success');
                    }
                } else if (serverBalance !== currentBalance) {
                    // Si el balance cambió pero no aumentó, actualizarlo de todas formas
                    setPointsBalance(serverBalance);
                    previousPointsBalanceRef.current = serverBalance;
                    if (userData.points !== undefined) {
                        setPoints(userData.points);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking balance:', error);
        } finally {
            isCheckingRef.current = false;
        }
    }, [userTelegramInitData, setPointsBalance, setPoints, showToast]);

    // Inicializar referencia del balance anterior
    useEffect(() => {
        previousPointsBalanceRef.current = pointsBalance;
    }, [pointsBalance]);

    // Hacer polling cada 10 segundos para verificar si el admin aceptó el pago
    useEffect(() => {
        if (!userTelegramInitData) return;

        // Verificar inmediatamente al montar el componente
        checkAndUpdateBalance();

        // Luego verificar cada 10 segundos
        intervalRef.current = setInterval(() => {
            checkAndUpdateBalance();
        }, 10000); // 10 segundos

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [userTelegramInitData, checkAndUpdateBalance]);

    const handleConfirmPurchase = async () => {
        if (!selectedPlan || purchasingPlan !== null) return;

        if (!walletAddress.trim()) {
            showToast('Please enter your wallet address', 'error');
            return;
        }

        setPurchasingPlan(selectedPlan);
        try {
            triggerHapticFeedback(window);
            const response = await fetch('/api/mining-plans/purchase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData: userTelegramInitData,
                    planAmount: selectedPlan,
                    transactionHash: walletAddress.trim(),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit purchase request');
            }

            const result = await response.json();
            setSelectedPlan(null); // Close modal after submission
            setWalletAddress(''); // Clear wallet address
            showToast(
                'Purchase request submitted! Please wait for admin confirmation. You will be notified when your USDT are added.',
                'success'
            );
        } catch (error) {
            console.error('Error purchasing mining plan:', error);
            showToast(
                error instanceof Error ? error.message : 'Failed to submit purchase request. Please try again.',
                'error'
            );
        } finally {
            setPurchasingPlan(null);
        }
    };

    return (
        <div className="bg-black flex justify-center min-h-screen">
            <div className="w-full bg-black text-white font-bold flex flex-col max-w-xl">
                <TopInfoSection setCurrentView={setCurrentView} />

                <div className="flex-grow mt-4 bg-[#f3ba2f] rounded-t-[48px] relative top-glow z-0">
                    <div className="mt-[2px] bg-[#1d2025] rounded-t-[46px] h-full overflow-y-auto no-scrollbar">
                        <div className="px-4 pt-1 pb-24">
                            <h1 className="text-2xl text-center mt-4">Mining Plans</h1>

                            <div className="px-4 mt-4 flex justify-center">
                                <div className="px-4 py-2 flex items-center space-x-2">
                                    <IceCubes className="w-12 h-12 mx-auto" />
                                    <p className="text-4xl text-white" suppressHydrationWarning >{Math.floor(pointsBalance).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Mining Plans Section */}
                            <div className="mt-8">
                                <div className="flex items-center justify-center mb-4">
                                    <div className="h-px bg-gradient-to-r from-transparent via-[#f3ba2f] to-transparent flex-1"></div>
                                    <h2 className="text-xl font-bold text-[#f3ba2f] px-4">Mining Plans</h2>
                                    <div className="h-px bg-gradient-to-r from-transparent via-[#f3ba2f] to-transparent flex-1"></div>
                                </div>

                                <p className="text-center text-sm text-gray-400 mb-4">
                                    Get double the usdt! Pay USDT and receive 2x USDT instantly after admin confirmation.
                                </p>

                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    {MINING_PLANS.map((planAmount) => {
                                        const pointsToReceive = planAmount * 2;
                                        const isPurchasing = purchasingPlan === planAmount;
                                        return (
                                            <button
                                                key={planAmount}
                                                onClick={() => handlePlanSelect(planAmount)}
                                                disabled={isPurchasing || purchasingPlan !== null}
                                                className={`
                                                    relative overflow-hidden
                                                    bg-gradient-to-br from-[#272a2f] to-[#1d2025]
                                                    border-2 rounded-xl p-4
                                                    transition-all duration-300
                                                    ${isPurchasing || purchasingPlan !== null
                                                        ? 'opacity-50 cursor-not-allowed'
                                                        : 'border-[#f3ba2f] hover:border-[#f3ba2f]/80 hover:shadow-lg hover:shadow-[#f3ba2f]/20 active:scale-95'
                                                    }
                                                `}
                                            >
                                                <div className="flex flex-col items-center">
                                                    <div className="text-2xl font-bold text-[#f3ba2f] mb-1">
                                                        {planAmount} USDT
                                                    </div>
                                                    <div className="text-xs text-gray-400 mb-2">Pay</div>
                                                    <div className="w-full h-px bg-[#f3ba2f]/30 my-2"></div>
                                                    <div className="text-lg font-bold text-green-400 mb-1">
                                                        +{formatNumber(pointsToReceive)}
                                                    </div>
                                                    <div className="text-xs text-gray-400">USDT</div>
                                                    {isPurchasing && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#f3ba2f]"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="bg-gradient-to-r from-[#f3ba2f]/10 to-transparent border-l-4 border-[#f3ba2f] rounded-lg p-3 mt-4">
                                    <p className="text-xs text-gray-300">
                                        <span className="text-[#f3ba2f] font-bold">Note:</span> After making the payment, enter your wallet address to verify the deposit and submit the purchase request. You&apos;ll receive a notification once admin confirms and your USDT are added.
                                    </p>
                                </div>
                            </div>

                            {/* Deposit Address Modal */}
                            {selectedPlan && (
                                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                                    <div className="bg-[#1d2025] rounded-2xl p-6 max-w-md w-full border-2 border-[#f3ba2f]">
                                        <h3 className="text-2xl font-bold text-[#f3ba2f] mb-4 text-center">
                                            Deposit {selectedPlan} USDT
                                        </h3>
                                        
                                        <div className="bg-[#272a2f] rounded-lg p-4 mb-4">
                                            <p className="text-sm text-gray-400 mb-2">Send exactly {selectedPlan} USDT to:</p>
                                            <div className="bg-black/50 rounded-lg p-3 mb-3">
                                                <p className="text-xs font-mono text-[#f3ba2f] break-all text-center">
                                                    {USDT_DEPOSIT_ADDRESS}
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleCopyAddress}
                                                className="w-full bg-[#f3ba2f] text-black font-bold py-2 rounded-lg hover:bg-[#f3ba2f]/90 transition-colors mb-4"
                                            >
                                                Copy Address
                                            </button>
                                            
                                            <div className="mb-3">
                                                <label className="block text-sm text-gray-400 mb-2">
                                                    Your Wallet Address *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={walletAddress}
                                                    onChange={(e) => setWalletAddress(e.target.value)}
                                                    placeholder="Enter your wallet address"
                                                    className="w-full bg-black/50 rounded-lg p-3 text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#f3ba2f]"
                                                    disabled={purchasingPlan !== null}
                                                />
                                                <p className="text-xs text-gray-500 mt-2 italic">
                                                    Note: This is used to verify your deposit and process your purchase request.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-[#272a2f] rounded-lg p-3 mb-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-gray-400">You will receive:</span>
                                                <span className="text-green-400 font-bold text-lg">
                                                    +{formatNumber(selectedPlan * 2)} USDT
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => {
                                                    setSelectedPlan(null);
                                                    setWalletAddress('');
                                                }}
                                                className="flex-1 bg-gray-600 text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleConfirmPurchase}
                                                disabled={purchasingPlan !== null || !walletAddress.trim()}
                                                className={`flex-1 font-bold py-3 rounded-lg transition-colors ${
                                                    purchasingPlan !== null || !walletAddress.trim()
                                                        ? 'bg-gray-500 cursor-not-allowed'
                                                        : 'bg-[#f3ba2f] text-black hover:bg-[#f3ba2f]/90'
                                                }`}
                                            >
                                                {purchasingPlan !== null ? (
                                                    <div className="flex justify-center">
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                                                    </div>
                                                ) : (
                                                    'Confirm Purchase'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}