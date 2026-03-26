// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Multicall3 Batch Utility
// Reduces hundreds of RPC calls to a few batched requests
// Uses standard Multicall3 deployed on all EVM chains
// ═══════════════════════════════════════════════════════════════════

const Multicall3 = {
  // Multicall3 стандартный адрес (одинаковый на всех EVM-сетях включая opBNB)
  ADDRESS: '0xcA11bde05977b3631167028862bE2a173976CA11',
  
  // Минимальный ABI для aggregate3
  ABI: [
    'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[])'
  ],

  _contract: null,

  // Получить или создать контракт Multicall3
  getContract() {
    if (this._contract) return this._contract;
    const provider = window.web3Manager?.provider;
    if (!provider) throw new Error('Web3 not initialized');
    this._contract = new ethers.Contract(this.ADDRESS, this.ABI, provider);
    return this._contract;
  },

  // ═══════════════════════════════════════════════════════════════
  // ОСНОВНОЙ МЕТОД: батч-вызов множества контрактных функций
  //
  // calls: массив объектов { contract, method, args }
  //   contract — ethers.Contract instance
  //   method   — string, имя метода (например 'getUserMaxLevel')
  //   args     — массив аргументов
  //
  // Возвращает: массив результатов (decoded), null если вызов упал
  // ═══════════════════════════════════════════════════════════════
  async batchCall(calls, { batchSize = 80 } = {}) {
    if (!calls || calls.length === 0) return [];
    
    // Если мало вызовов — не тратим время на multicall overhead
    if (calls.length <= 2) {
      return Promise.all(calls.map(async (call) => {
        try {
          const result = await call.contract[call.method](...call.args);
          return result;
        } catch (e) {
          return null;
        }
      }));
    }

    const mc = this.getContract();
    const allResults = new Array(calls.length).fill(null);

    // Разбиваем на батчи
    for (let i = 0; i < calls.length; i += batchSize) {
      const batch = calls.slice(i, i + batchSize);
      
      // Кодируем calldata
      const encoded = batch.map(call => {
        try {
          const iface = call.contract.interface;
          const callData = iface.encodeFunctionData(call.method, call.args);
          return {
            target: call.contract.address,
            allowFailure: true,
            callData
          };
        } catch (e) {
          console.warn('⚠️ Multicall encode error:', call.method, e.message);
          return null;
        }
      });

      // Фильтруем битые
      const validIndices = [];
      const validCalls = [];
      encoded.forEach((enc, idx) => {
        if (enc) {
          validIndices.push(idx);
          validCalls.push(enc);
        }
      });

      if (validCalls.length === 0) continue;

      try {
        const results = await mc.aggregate3(validCalls);
        
        // Декодируем результаты
        validIndices.forEach((origIdx, resultIdx) => {
          const call = batch[origIdx];
          const result = results[resultIdx];
          
          if (result.success && result.returnData !== '0x') {
            try {
              const decoded = call.contract.interface.decodeFunctionResult(
                call.method, 
                result.returnData
              );
              // Если результат — одно значение, разворачиваем
              allResults[i + origIdx] = decoded.length === 1 ? decoded[0] : decoded;
            } catch (e) {
              allResults[i + origIdx] = null;
            }
          }
        });
      } catch (e) {
        console.warn('⚠️ Multicall3 batch failed, falling back to individual calls:', e.message);
        // Fallback: вызываем по одному
        await Promise.all(batch.map(async (call, idx) => {
          try {
            allResults[i + idx] = await call.contract[call.method](...call.args);
          } catch (err) {
            allResults[i + idx] = null;
          }
        }));
      }
    }

    return allResults;
  }
};

// Экспорт в глобальный scope
window.Multicall3 = Multicall3;
