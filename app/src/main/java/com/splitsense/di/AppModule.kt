package com.splitsense.di

import android.content.Context
import androidx.room.Room
import com.splitsense.data.local.SplitSenseDatabase
import com.splitsense.data.local.dao.ExpenseDao
import com.splitsense.data.local.dao.MemberDao
import com.splitsense.data.local.dao.RoomDao
import com.splitsense.data.remote.SplitSenseApi
import com.splitsense.util.IdentityManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }

    @Provides
    @Singleton
    fun provideHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            })
            .build()
    }

    @Provides
    @Singleton
    fun provideSplitSenseApi(client: OkHttpClient, json: Json): SplitSenseApi {
        return Retrofit.Builder()
            // Configured for local Wi-Fi connection to host PC (192.168.1.7)
            .baseUrl("http://192.168.1.7:5000/")
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(SplitSenseApi::class.java)
    }

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): SplitSenseDatabase {
        return Room.databaseBuilder(
            context,
            SplitSenseDatabase::class.java,
            "splitsense_db"
        ).fallbackToDestructiveMigration().build()
    }

    @Provides
    fun provideRoomDao(db: SplitSenseDatabase): RoomDao = db.roomDao()

    @Provides
    fun provideMemberDao(db: SplitSenseDatabase): MemberDao = db.memberDao()

    @Provides
    fun provideExpenseDao(db: SplitSenseDatabase): ExpenseDao = db.expenseDao()

    @Provides
    @Singleton
    fun provideIdentityManager(@ApplicationContext context: Context): IdentityManager {
        return IdentityManager(context)
    }
}
