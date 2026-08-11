package com.splitsense.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.splitsense.data.local.dao.ExpenseDao
import com.splitsense.data.local.dao.MemberDao
import com.splitsense.data.local.dao.RoomDao
import com.splitsense.data.local.entities.ExpenseEntity
import com.splitsense.data.local.entities.MemberEntity
import com.splitsense.data.local.entities.RoomEntity

@Database(
    entities = [RoomEntity::class, MemberEntity::class, ExpenseEntity::class],
    version = 2,
    exportSchema = false
)
abstract class SplitSenseDatabase : RoomDatabase() {
    abstract fun roomDao(): RoomDao
    abstract fun memberDao(): MemberDao
    abstract fun expenseDao(): ExpenseDao

    companion object {
        @Volatile
        private var INSTANCE: SplitSenseDatabase? = null

        fun getDatabase(context: android.content.Context): SplitSenseDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = androidx.room.Room.databaseBuilder(
                    context.applicationContext,
                    SplitSenseDatabase::class.java,
                    "splitsense_db"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
