package fr.univ.angers.ageline.signaluo

import java.util.UUID

data class Report(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val description: String,
    val category: String,
    val date: String,
    val status: String = STATUS_SENT,
    val location: String = DEFAULT_LOCATION, 
    val hasPhoto: Boolean = false,
    val isAnonymous: Boolean = true,
    val userName: String = "",
    val userEmail: String = "",
    val userPhone: String = ""
) {
    companion object {
        const val STATUS_SENT = "Envoyé"
        const val STATUS_IN_PROGRESS = "En cours"
        const val STATUS_RESOLVED = "Traité"
        const val DEFAULT_LOCATION = "47.4712° N, 0.5513° W"
    }
}
