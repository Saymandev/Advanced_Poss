'use client';

import { Button } from './Button';
import { Modal } from './Modal';
import { useState } from 'react';

interface CalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onResult?: (result: number) => void;
}

export function Calculator({ isOpen, onClose, onResult }: CalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [expression, setExpression] = useState<string>('');

  const inputNumber = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(String(num));
      setWaitingForNewValue(false);
      setExpression('');
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
    }
  };

  const inputDecimal = () => {
    if (waitingForNewValue) {
      setDisplay('0.');
      setWaitingForNewValue(false);
      setExpression('');
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(false);
    setExpression('');
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);
    const operationSymbol = nextOperation === '*' ? '×' : nextOperation === '/' ? '÷' : nextOperation;

    if (previousValue === null) {
      setPreviousValue(inputValue);
      setExpression(`${inputValue} ${operationSymbol}`);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
      setExpression(`${newValue} ${operationSymbol}`);
    } else {
      // If no previous operation, just show the current expression
      setExpression(`${inputValue} ${operationSymbol}`);
    }

    setWaitingForNewValue(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '*':
        return firstValue * secondValue;
      case '/':
        return secondValue !== 0 ? firstValue / secondValue : 0;
      case '=':
        return secondValue;
      default:
        return secondValue;
    }
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      const operationSymbol = operation === '*' ? '×' : operation === '/' ? '÷' : operation;
      setExpression(`${previousValue} ${operationSymbol} ${inputValue} =`);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewValue(true);
      
      if (onResult) {
        onResult(newValue);
      }
    }
  };

  const handleBackspace = () => {
    if (waitingForNewValue) {
      return; // Don't allow backspace when waiting for new value
    }
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handlePercentage = () => {
    const value = parseFloat(display) / 100;
    setDisplay(String(value));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Calculator" size="sm">
      <div className="space-y-4">
        {/* Display */}
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-right">
          {expression && (
            <div className="text-sm font-mono text-gray-600 dark:text-gray-400 mb-2 min-h-[20px] overflow-x-auto">
              {expression}
            </div>
          )}
          <div className="text-3xl font-mono font-semibold text-gray-900 dark:text-white overflow-x-auto">
            {display}
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-4 gap-2">
          {/* Row 1 */}
          <Button
            variant="secondary"
            onClick={clear}
            className="col-span-2 bg-red-500 hover:bg-red-600 text-white"
          >
            Clear
          </Button>
          <Button
            variant="secondary"
            onClick={handleBackspace}
            className="bg-gray-500 hover:bg-gray-600 text-white"
          >
            ⌫
          </Button>
          <Button
            variant="secondary"
            onClick={() => performOperation('/')}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            ÷
          </Button>

          {/* Row 2 */}
          <Button
            variant="secondary"
            onClick={() => inputNumber('7')}
            className="bg-gray-700 hover:bg-gray-600 text-white"
          >
            7
          </Button>
          <Button
            variant="secondary"
            onClick={() => inputNumber('8')}
            className="bg-gray-700 hover:bg-gray-600 text-white"
          >
            8
          </Button>
          <Button
            variant="secondary"
            onClick={() => inputNumber('9')}
            className="bg-gray-700 hover:bg-gray-600 text-white"
          >
            9
          </Button>
          <Button
            variant="secondary"
            onClick={() => performOperation('*')}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            ×
          </Button>

          {/* Row 3 */}
          <Button
            variant="secondary"
            onClick={() => inputNumber('4')}
            className="bg-gray-700 hover:bg-gray-600 text-white"
          >
            4
          </Button>
          <Button
            variant="secondary"
            onClick={() => inputNumber('5')}
            className="bg-gray-700 hover:bg-gray-600 text-white"
          >
            5
          </Button>
          <Button
            variant="secondary"
            onClick={() => inputNumber('6')}
            className="bg-gray-700 hover:bg-gray-600 text-white"
          >
            6
          </Button>
          <Button
            variant="secondary"
            onClick={() => performOperation('-')}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            −
          </Button>

          {/* Row 4 */}
          <Button
            variant="secondary"
            onClick={() => inputNumber('1')}
            className="bg-gray-700 hover:bg-gray-600 text-white"
          >
            1
          </Button>
          <Button
            variant="secondary"
            onClick={() => inputNumber('2')}
            className="bg-gray-700 hover:bg-gray-600 text-white"
          >
            2
          </Button>
          <Button
            variant="secondary"
            onClick={() => inputNumber('3')}
            className="bg-gray-700 hover:bg-gray-600 text-white"
          >
            3
          </Button>
          <Button
            variant="secondary"
            onClick={() => performOperation('+')}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            +
          </Button>

          {/* Row 5 */}
          <Button
            variant="secondary"
            onClick={() => inputNumber('0')}
            className="col-span-2 bg-gray-700 hover:bg-gray-600 text-white"
          >
            0
          </Button>
          <Button
            variant="secondary"
            onClick={inputDecimal}
            className="bg-gray-700 hover:bg-gray-600 text-white"
          >
            .
          </Button>
          <Button
            variant="primary"
            onClick={handleEquals}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            =
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="secondary"
            onClick={() => {
              if (onResult) {
                onResult(parseFloat(display));
              }
              onClose();
            }}
            className="flex-1"
          >
            Use Result
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

