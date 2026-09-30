package fr.univ.angers.ageline.signaluo

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class ReportViewModel : ViewModel() {
    private val _title = MutableStateFlow("")
    val title: StateFlow<String> = _title.asStateFlow()

    private val _description = MutableStateFlow("")
    val description: StateFlow<String> = _description.asStateFlow()

    private val _category = MutableStateFlow("")
    val category: StateFlow<String> = _category.asStateFlow()

    private val _hasPhoto = MutableStateFlow(false)
    val hasPhoto: StateFlow<Boolean> = _hasPhoto.asStateFlow()

    private val _location = MutableStateFlow("")
    val location: StateFlow<String> = _location.asStateFlow()

    private val _isAnonymous = MutableStateFlow(true)
    val isAnonymous: StateFlow<Boolean> = _isAnonymous.asStateFlow()

    private val _lastName = MutableStateFlow("")
    val lastName: StateFlow<String> = _lastName.asStateFlow()

    private val _firstName = MutableStateFlow("")
    val firstName: StateFlow<String> = _firstName.asStateFlow()

    private val _email = MutableStateFlow("")
    val email: StateFlow<String> = _email.asStateFlow()

    private val _phone = MutableStateFlow("")
    val phone: StateFlow<String> = _phone.asStateFlow()

    fun setCategory(category: String) {
        _category.value = category
    }

    fun setPhoto(hasPhoto: Boolean) {
        _hasPhoto.value = hasPhoto
    }

    fun setLocation(location: String) {
        _location.value = location
    }

    fun setDetails(title: String, description: String) {
        _title.value = title
        _description.value = description
    }

    fun setAnonymous(isAnonymous: Boolean) {
        _isAnonymous.value = isAnonymous
    }

    fun setContactInfo(lastName: String, firstName: String, email: String, phone: String) {
        _lastName.value = lastName
        _firstName.value = firstName
        _email.value = email
        _phone.value = phone
    }

    fun reset() {
        _title.value = ""
        _description.value = ""
        _category.value = ""
        _hasPhoto.value = false
        _location.value = ""
        _isAnonymous.value = true
        _lastName.value = ""
        _firstName.value = ""
        _email.value = ""
        _phone.value = ""
    }
}
