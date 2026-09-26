const {doTransaction} = require('../database');

doTransaction(async (connection, commit) => {
    const [result] = await connection.query('INSERT IGNORE INTO features (id, enabled) VALUES ?', [[['cases', 1], ['fiatDeposits', 1]]]);
    await commit();
    console.log(`Added ${result.affectedRows} missing case/gift-card feature flag(s). Existing settings were preserved.`);
}).then(() => process.exit(0)).catch(error => {console.error(error.message);process.exit(1);});
