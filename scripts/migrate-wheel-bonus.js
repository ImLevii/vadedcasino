const {doTransaction} = require('../database');

doTransaction(async (connection, commit) => {
    const [result] = await connection.query(
        'UPDATE gameSettings SET value = ?, description = ?, step = ? WHERE game = ? AND `key` = ? AND value = ?',
        ['0.66', 'Portion of all coin-balance bets added to the Wheel Bonus pot', '0.01', 'roulette', 'tripleGreenBonusRake', '0.75']);
    await commit();
    console.log(`Updated ${result.affectedRows} default wheel bonus setting(s). Custom rates and the existing pot were preserved.`);
}).then(() => process.exit(0)).catch(error => {console.error(error.message);process.exit(1);});
