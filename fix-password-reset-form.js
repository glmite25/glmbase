#!/usr/bin/env node

/**
 * Fix Password Reset Form Issue
 * Create a proper password reset flow
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

function createServiceRoleClient() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing required environment variables');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

async function fixPasswordResetForm() {
    console.log('🔧 Fixing password reset form issue...\n');
    
    const supabase = createServiceRoleClient();
    
    try {
        // Step 1: Check current redirect URLs in Supabase
        console.log('1. Current configuration:');
        console.log(`   Supabase URL: ${process.env.VITE_SUPABASE_URL}`);
        console.log(`   App URL: ${process.env.VITE_APP_URL || 'http://localhost:7070'}`);
        
        // Step 2: Test password reset with proper redirect URL
        console.log('\n2. Testing password reset for popsabey1@gmail.com...');
        
        const testClient = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );
        
        const redirectUrl = `${process.env.VITE_APP_URL || 'http://localhost:7070'}/reset-password`;
        
        const { error: resetError } = await testClient.auth.resetPasswordForEmail('popsabey1@gmail.com', {
            redirectTo: redirectUrl
        });
        
        if (resetError) {
            console.log(`   ❌ Password reset failed: ${resetError.message}`);
        } else {
            console.log('   ✅ Password reset email sent successfully');
            console.log(`   🔗 Redirect URL: ${redirectUrl}`);
        }
        
        // Step 3: Create a simple password reset page content
        console.log('\n3. Creating password reset page...');
        
        const resetPageContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - Gospel Labour Ministry</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 400px;
            margin: 100px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input[type="password"] {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
        }
        button {
            width: 100%;
            padding: 12px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
        }
        button:hover {
            background-color: #0056b3;
        }
        .message {
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 4px;
        }
        .success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Reset Your Password</h2>
        <div id="message"></div>
        
        <form id="resetForm">
            <div class="form-group">
                <label for="password">New Password:</label>
                <input type="password" id="password" name="password" required minlength="6">
            </div>
            
            <div class="form-group">
                <label for="confirmPassword">Confirm Password:</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required minlength="6">
            </div>
            
            <button type="submit">Update Password</button>
        </form>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script>
        const { createClient } = supabase;
        
        const supabaseClient = createClient(
            '${process.env.VITE_SUPABASE_URL}',
            '${process.env.VITE_SUPABASE_ANON_KEY}'
        );

        const messageDiv = document.getElementById('message');
        const form = document.getElementById('resetForm');

        // Check if we have access token in URL
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');

        if (!accessToken) {
            messageDiv.innerHTML = '<div class="error">Invalid reset link. Please request a new password reset.</div>';
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                messageDiv.innerHTML = '<div class="error">Passwords do not match.</div>';
                return;
            }
            
            if (password.length < 6) {
                messageDiv.innerHTML = '<div class="error">Password must be at least 6 characters long.</div>';
                return;
            }
            
            try {
                // Set the session with the tokens from URL
                const { error: sessionError } = await supabaseClient.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                });
                
                if (sessionError) {
                    throw sessionError;
                }
                
                // Update the password
                const { error: updateError } = await supabaseClient.auth.updateUser({
                    password: password
                });
                
                if (updateError) {
                    throw updateError;
                }
                
                messageDiv.innerHTML = '<div class="success">Password updated successfully! You can now sign in with your new password.</div>';
                form.style.display = 'none';
                
                // Redirect to login page after 3 seconds
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
                
            } catch (error) {
                messageDiv.innerHTML = '<div class="error">Error updating password: ' + error.message + '</div>';
            }
        });
    </script>
</body>
</html>`;

        // Save the reset page content to a file
        require('fs').writeFileSync('public/reset-password.html', resetPageContent);
        console.log('   ✅ Created reset-password.html in public folder');
        
        console.log('\n🎯 PASSWORD RESET FIX COMPLETE!');
        console.log('\n💡 Next steps:');
        console.log('   1. Make sure your app serves the reset-password.html file at /reset-password');
        console.log('   2. In Supabase dashboard, go to Authentication > URL Configuration');
        console.log('   3. Add this redirect URL: http://localhost:7070/reset-password');
        console.log('   4. Test password reset by sending reset email to popsabey1@gmail.com');
        
        console.log('\n📧 To test password reset:');
        console.log('   1. Go to your login page');
        console.log('   2. Click "Forgot Password"');
        console.log('   3. Enter: popsabey1@gmail.com');
        console.log('   4. Check email and click the reset link');
        console.log('   5. You should see the password reset form');
        
        return true;
        
    } catch (error) {
        console.error('\n💥 FAILED:', error.message);
        return false;
    }
}

// Run the fix
fixPasswordResetForm()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });