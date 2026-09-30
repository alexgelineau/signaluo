package fr.univ.angers.ageline.signaluo

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object ReportRepository {
    private val _reports = MutableStateFlow<List<Report>>(emptyList())
    val reports: StateFlow<List<Report>> = _reports.asStateFlow()

    private val _isManagerMode = MutableStateFlow(false)
    val isManagerMode: StateFlow<Boolean> = _isManagerMode.asStateFlow()

    fun setManagerMode(enabled: Boolean) {
        _isManagerMode.value = enabled
    }

    fun updateReportStatus(id: String, newStatus: String) {
        _reports.value = _reports.value.map { report ->
            if (report.id == id) {
                report.copy(status = newStatus)
            } else {
                report
            }
        }
    }

    fun cycleReportStatus(id: String): String? {
        var updatedStatus: String? = null
        _reports.value = _reports.value.map { report ->
            if (report.id == id) {
                val next = when (report.status) {
                    Report.STATUS_SENT -> Report.STATUS_IN_PROGRESS
                    Report.STATUS_IN_PROGRESS -> Report.STATUS_RESOLVED
                    else -> Report.STATUS_SENT
                }
                updatedStatus = next
                report.copy(status = next)
            } else {
                report
            }
        }
        return updatedStatus
    }

    fun initializeWithDummyData(context: android.content.Context) {
        if (_reports.value.isNotEmpty()) return
        
        val sdf = SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE)
        val today = sdf.format(Date())
        
        _reports.value = listOf(
            Report(
                title = context.getString(R.string.dummy_title_pothole),
                description = context.getString(R.string.dummy_desc_pothole),
                category = context.getString(R.string.category_road),
                date = today,
                status = Report.STATUS_IN_PROGRESS
            ),
            Report(
                title = context.getString(R.string.dummy_title_lamp),
                description = context.getString(R.string.dummy_desc_lamp),
                category = context.getString(R.string.category_lighting),
                date = today,
                status = Report.STATUS_RESOLVED
            )
        )
    }

    fun addReport(
        title: String,
        description: String,
        category: String,
        location: String = Report.DEFAULT_LOCATION,
        hasPhoto: Boolean = false,
        isAnonymous: Boolean = true,
        userName: String = "",
        userEmail: String = "",
        userPhone: String = ""
    ) {
        val sdf = SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE)
        val currentDate = sdf.format(Date())
        val newReport = Report(
            title = title,
            description = description,
            category = category,
            date = currentDate,
            location = location,
            hasPhoto = hasPhoto,
            isAnonymous = isAnonymous,
            userName = userName,
            userEmail = userEmail,
            userPhone = userPhone
        )
        _reports.value = _reports.value + newReport
    }
}
