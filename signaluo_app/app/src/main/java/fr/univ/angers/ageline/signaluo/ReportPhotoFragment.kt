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
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import fr.univ.angers.ageline.signaluo.databinding.FragmentReportPhotoBinding
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class ReportPhotoFragment : Fragment() {

    private var _binding: FragmentReportPhotoBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ReportViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentReportPhotoBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.btnViewHistory.setOnClickListener {
            findNavController().navigate(R.id.action_reportPhotoFragment_to_homeFragment)
        }

        binding.cardPhoto.setOnClickListener {
            showPhotoSourceDialog()
        }

        binding.btnTakePhoto.setOnClickListener {
            showPhotoSourceDialog()
        }

        binding.btnNext.setOnClickListener {
            if (viewModel.hasPhoto.value) {
                findNavController().navigate(R.id.action_reportPhotoFragment_to_reportCategoryFragment)
            }
        }

        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.hasPhoto.collectLatest { hasPhoto ->
                binding.btnNext.isEnabled = hasPhoto
                if (hasPhoto) {
                    binding.layoutNoPhoto.visibility = View.GONE
                    binding.ivCapturedPhoto.visibility = View.VISIBLE
                    binding.ivCapturedPhoto.setImageResource(android.R.drawable.ic_menu_gallery)
                    binding.btnTakePhoto.text = getString(R.string.btn_change_photo)
                } else {
                    binding.layoutNoPhoto.visibility = View.VISIBLE
                    binding.ivCapturedPhoto.visibility = View.GONE
                    binding.btnTakePhoto.text = getString(R.string.dialog_photo_source_title)
                }
            }
        }
    }

    private fun showPhotoSourceDialog() {
        val options = arrayOf(
            getString(R.string.action_take_photo),
            getString(R.string.action_choose_gallery)
        )

        MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.dialog_photo_source_title))
            .setItems(options) { _, which ->
                val sourceText = if (which == 0) getString(R.string.loading_camera) else "Accès galerie..."
                binding.btnTakePhoto.isEnabled = false
                binding.btnTakePhoto.text = sourceText

                view?.postDelayed({
                    viewModel.setPhoto(true)
                    binding.btnTakePhoto.isEnabled = true
                    Toast.makeText(requireContext(), getString(R.string.toast_photo_captured), Toast.LENGTH_SHORT).show()
                }, 800)
            }
            .setNegativeButton(getString(R.string.btn_cancel), null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
