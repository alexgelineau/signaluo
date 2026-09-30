package fr.univ.angers.ageline.signaluo

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import fr.univ.angers.ageline.signaluo.databinding.FragmentHomeBinding
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }

        val screenWidth = resources.configuration.screenWidthDp
        val spanCount = if (screenWidth >= 600) 2 else 1

        val adapter = ReportAdapter()

        binding.rvReports.apply {
            layoutManager = androidx.recyclerview.widget.GridLayoutManager(requireContext(), spanCount)
            this.adapter = adapter
        }

        viewLifecycleOwner.lifecycleScope.launch {
            ReportRepository.reports.collectLatest { reports ->
                adapter.submitList(reports)
                binding.layoutEmptyState.visibility = if (reports.isEmpty()) View.VISIBLE else View.GONE
                binding.rvReports.visibility = if (reports.isEmpty()) View.GONE else View.VISIBLE
                
                if (reports.isNotEmpty()) {
                    binding.rvReports.scheduleLayoutAnimation()
                }
            }
        }

        binding.fabAddReport.setOnClickListener {
            findNavController().navigate(R.id.action_homeFragment_to_reportPhotoFragment)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
