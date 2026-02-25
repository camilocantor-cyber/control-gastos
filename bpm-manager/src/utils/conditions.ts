
/**
 * Evaluates a condition string against a data object.
 * Supported operators: >, <, >=, <=, =, !=
 * 
 * Examples:
 * "Amount > 1000"
 * "City = Bogota"
 * "Status != Pending"
 * 
 * @param condition The condition string (e.g., "Field > Value")
 * @param data The data object containing field values (e.g., { Amount: "1500", City: "Bogota" })
 * @returns true if the condition is met or if the condition is empty/invalid, false otherwise.
 */
export function evaluateCondition(condition: string | undefined, data: Record<string, string>): boolean {
    if (!condition || !condition.trim()) return true;

    // Normalize condition
    // 1. Split by operators
    const operators = ['>=', '<=', '!=', '=', '>', '<'];
    let operator = '';

    for (const op of operators) {
        if (condition.includes(op)) {
            operator = op;
            break;
        }
    }

    if (!operator) {
        console.warn('Condition has no valid operator:', condition);
        return true; // Fail open if syntax is weird, or strict? Let's fail open to not block flow.
    }

    const [leftRaw, rightRaw] = condition.split(operator);
    const fieldName = leftRaw.trim();
    const targetValue = rightRaw.trim().replace(/^['"]|['"]$/g, ''); // Remove quotes if present

    const actualValue = data[fieldName];

    // If field doesn't exist in data, we can't evaluate properly. 
    // Assuming false for safety, or check if user meant a literal.
    if (actualValue === undefined) {
        console.log(`Field '${fieldName}' not found in data for condition '${condition}'`);
        return false;
    }

    // Try numeric comparison first
    const numActual = parseFloat(actualValue);
    const numTarget = parseFloat(targetValue);

    const isNumeric = !isNaN(numActual) && !isNaN(numTarget);

    switch (operator) {
        case '>':
            return isNumeric ? numActual > numTarget : actualValue > targetValue;
        case '<':
            return isNumeric ? numActual < numTarget : actualValue < targetValue;
        case '>=':
            return isNumeric ? numActual >= numTarget : actualValue >= targetValue;
        case '<=':
            return isNumeric ? numActual <= numTarget : actualValue <= targetValue;
        case '=':
            // For loose equality
            return isNumeric ? numActual === numTarget : actualValue.toLowerCase() === targetValue.toLowerCase();
        case '!=':
            return isNumeric ? numActual !== numTarget : actualValue.toLowerCase() !== targetValue.toLowerCase();
        default:
            return true;
    }
}
