#!/usr/bin/env node

/**
 * Runner script for superadmin diagnostics
 * Usage: node run-superadmin-diagnostics.js [--quick]
 */

import SuperadminDiagnostics from './superadmin-diagnostic-script.js';
import { runComprehensiveVerification, quickHealthCheck } from './superadmin-verification-functions.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
    const args = process.argv.slice(2);
    const isQuickCheck = args.includes('--quick');
    
    console.log('🚀 Superadmin Authentication Diagnostics');
    console.log('==========================================');
    
    if (isQuickCheck) {
        console.log('Running quick health check...\n');
        
        try {
            const isHealthy = await quickHealthCheck();
            
            if (isHealthy) {
                console.log('✅ Superadmin account is healthy and can authenticate');
                process.exit(0);
            } else {
                console.log('❌ Superadmin account has issues');
                console.log('Run without --quick flag for detailed diagnostics');
                process.exit(1);
            }
        } catch (err) {
            console.error('💥 Quick health check failed:', err.message);
            process.exit(1);
        }
    } else {
        console.log('Running full diagnostic suite...\n');
        
        try {
            // Run the comprehensive diagnostic
            const diagnostic = new SuperadminDiagnostics();
            const report = await diagnostic.runFullDiagnostic();
            
            // Also run verification functions for comparison
            console.log('\n🔄 Running verification functions...');
            const verification = await runComprehensiveVerification();
            
            console.log('\n📊 FINAL SUMMARY:');
            console.log(`Overall Health: ${verification.summary.isHealthy ? '✅ HEALTHY' : '❌ ISSUES FOUND'}`);
            console.log(`Can Authenticate: ${verification.summary.canAuthenticate ? '✅ YES' : '❌ NO'}`);
            console.log(`All Records Exist: ${verification.summary.allRecordsExist ? '✅ YES' : '❌ NO'}`);
            console.log(`Total Issues: ${verification.summary.totalIssues}`);
            
            if (verification.summary.totalIssues > 0) {
                console.log('\n🔧 Issues to fix:');
                verification.allIssues.forEach((issue, index) => {
                    console.log(`${index + 1}. ${issue}`);
                });
            }
            
            process.exit(verification.summary.isHealthy ? 0 : 1);
        } catch (err) {
            console.error('💥 Diagnostic failed:', err.message);
            process.exit(1);
        }
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run main function
main().catch(err => {
    console.error('💥 Script failed:', err);
    process.exit(1);
});