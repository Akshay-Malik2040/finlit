package com.example.myapplication

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity

/**
 * SplitSense Native Android V2
 * 
 * This file redirects to the production package [com.splitsense].
 * The application entry point is configured as com.splitsense.MainActivity 
 * in the AndroidManifest.xml.
 * 
 * Please refer to the 'com.splitsense' package for the implementation 
 * of screens, ViewModels, and data layers.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        startActivity(Intent(this, com.splitsense.MainActivity::class.java))
        finish()
    }
}
