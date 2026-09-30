package fr.univ.angers.ageline.signaluo

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import fr.univ.angers.ageline.signaluo.databinding.DialogAdminPasswordBinding
import fr.univ.angers.ageline.signaluo.databinding.FragmentDashboardBinding
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class DashboardFragment : Fragment() {

    private var _binding: FragmentDashboardBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentDashboardBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        viewLifecycleOwner.lifecycleScope.launch {
            ReportRepository.reports.collectLatest { reports ->
                val inProgress = reports.count { it.status != Report.STATUS_RESOLVED }
                val resolved = reports.count { it.status == Report.STATUS_RESOLVED }
                binding.tvInProgressCount.text = inProgress.toString()
                binding.tvResolvedCount.text = resolved.toString()
            }
        }

        viewLifecycleOwner.lifecycleScope.launch {
            ReportRepository.isManagerMode.collectLatest { isManager ->
                if (isManager) {
                    binding.fabAdmin.setImageResource(R.drawable.ic_lock_open)
                } else {
                    binding.fabAdmin.setImageResource(R.drawable.ic_lock)
                }
            }
        }

        binding.btnStartReport.setOnClickListener {
            findNavController().navigate(R.id.action_dashboardFragment_to_reportCategoryFragment)
        }

        binding.btnViewHistory.setOnClickListener {
            findNavController().navigate(R.id.action_dashboardFragment_to_homeFragment)
        }

        binding.fabAdmin.setOnClickListener {
            if (ReportRepository.isManagerMode.value) {
                // Déjà actif, on redirige directement vers la gestion des demandes
                findNavController().navigate(R.id.action_dashboardFragment_to_homeFragment)
            } else {
                showAdminPasswordDialog()
            }
        }
    }

    private fun showAdminPasswordDialog() {
        val dialogBinding = DialogAdminPasswordBinding.inflate(layoutInflater)

        MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.admin_password_title))
            .setMessage(getString(R.string.admin_password_message))
            .setView(dialogBinding.root)
            .setPositiveButton(getString(R.string.btn_validate)) { _, _ ->
                val password = dialogBinding.etPassword.text?.toString().orEmpty()
                if (password == "1234") {
                    ReportRepository.setManagerMode(true)
                    Toast.makeText(requireContext(), getString(R.string.admin_mode_activated), Toast.LENGTH_SHORT).show()
                    findNavController().navigate(R.id.action_dashboardFragment_to_homeFragment)
                } else {
                    Toast.makeText(requireContext(), getString(R.string.admin_password_error), Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton(getString(R.string.btn_cancel), null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
