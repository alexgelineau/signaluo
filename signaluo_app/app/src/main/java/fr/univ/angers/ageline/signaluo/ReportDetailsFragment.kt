package fr.univ.angers.ageline.signaluo

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import fr.univ.angers.ageline.signaluo.databinding.FragmentReportDetailsBinding
import kotlinx.coroutines.launch

class ReportDetailsFragment : Fragment() {

    private var _binding: FragmentReportDetailsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ReportViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentReportDetailsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }

        binding.cardSendAnonymous.setOnClickListener {
            setSendingOption(isAnonymous = true)
        }

        binding.cardSendWithContact.setOnClickListener {
            setSendingOption(isAnonymous = false)
        }

        binding.btnSubmit.setOnClickListener {
            submitReport()
        }

        setSendingOption(isAnonymous = true)
    }

    private fun setSendingOption(isAnonymous: Boolean) {
        viewModel.setAnonymous(isAnonymous)
        val dp3 = (3 * resources.displayMetrics.density).toInt()
        val dp1 = (1 * resources.displayMetrics.density).toInt()

        if (isAnonymous) {
            binding.rbAnonymous.isChecked = true
            binding.rbContact.isChecked = false
            binding.cardSendAnonymous.strokeWidth = dp3
            binding.cardSendWithContact.strokeWidth = dp1
            binding.layoutContactForm.visibility = View.GONE
        } else {
            binding.rbAnonymous.isChecked = false
            binding.rbContact.isChecked = true
            binding.cardSendAnonymous.strokeWidth = dp1
            binding.cardSendWithContact.strokeWidth = dp3
            binding.layoutContactForm.visibility = View.VISIBLE
        }
    }

    private fun submitReport() {
        val isAnonymous = viewModel.isAnonymous.value
        val lastName = binding.etLastName.text.toString().trim()
        val firstName = binding.etFirstName.text.toString().trim()
        val email = binding.etEmail.text.toString().trim()
        val phone = binding.etPhone.text.toString().trim()

        if (!isAnonymous && (lastName.isBlank() || email.isBlank())) {
            Toast.makeText(requireContext(), getString(R.string.error_contact_required), Toast.LENGTH_SHORT).show()
            return
        }

        binding.btnSubmit.isEnabled = false
        binding.btnSubmit.text = getString(R.string.loading_sending)

        viewLifecycleOwner.lifecycleScope.launch {
            val title = viewModel.title.value
            val description = viewModel.description.value
            val category = viewModel.category.value
            val location = viewModel.location.value.ifBlank { Report.DEFAULT_LOCATION }
            val hasPhoto = viewModel.hasPhoto.value

            val userName = if (!isAnonymous) "$firstName $lastName".trim() else ""

            view?.postDelayed({
                ReportRepository.addReport(
                    title = title,
                    description = description,
                    category = category,
                    location = location,
                    hasPhoto = hasPhoto,
                    isAnonymous = isAnonymous,
                    userName = userName,
                    userEmail = email,
                    userPhone = phone
                )

                Toast.makeText(requireContext(), getString(R.string.toast_success), Toast.LENGTH_LONG).show()
                viewModel.reset()
                findNavController().navigate(R.id.action_reportDetailsFragment_to_reportPhotoFragment)
            }, 1200)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
