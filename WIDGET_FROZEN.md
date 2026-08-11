# 🚨 FROZEN WIDGET FILES — READ ONLY 🚨

The following files constitute the SplitSense Android Home-Screen Widget implementation.
Per explicit instructions, **DO NOT MODIFY, REFACTOR, EDIT, OR DELETE ANY OF THESE FILES**.

## Frozen Widget Kotlin Files
- `app/src/main/java/com/splitsense/widget/SplitSenseWidget.kt`
- `app/src/main/java/com/splitsense/widget/SplitSenseWidgetReceiver.kt`
- `app/src/main/java/com/splitsense/widget/WidgetActions.kt`
- `app/src/main/java/com/splitsense/widget/WidgetQuickAddActivity.kt`

## Frozen Widget Manifest & XML Configuration
- `app/src/main/res/xml/split_sense_widget_info.xml`
- Receiver & Activity declarations for `SplitSenseWidgetReceiver` and `WidgetQuickAddActivity` in `app/src/main/AndroidManifest.xml`

## Policy & Strategy for Feature Parity Tasks
- All feature parity work (CRUD, AI Insights, Settlements, Recurring Expenses, Analytics, etc.) MUST be implemented in app-specific screens, viewmodels, repositories, and UI components.
- Do NOT alter shared interfaces or widget structures. Re-use data layer methods safely or extend app-specific adapters.
