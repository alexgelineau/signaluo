package fr.univ.angers.ageline.signaluo

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.google.android.material.card.MaterialCardView
import fr.univ.angers.ageline.signaluo.databinding.FragmentReportCategoryBinding
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class ReportCategoryFragment : Fragment() {

    private var _binding: FragmentReportCategoryBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ReportViewModel by activityViewModels()

    private val categoryIcons = mapOf(
        "Voirie" to R.drawable.ic_road,
        "Éclairage" to R.drawable.ic_light,
        "Propreté" to R.drawable.ic_trash,
        "Espaces Verts" to R.drawable.ic_nature,
        "Autre" to R.drawable.ic_more
    )

    private val categoryColors = mapOf(
        "Voirie" to R.color.cat_road,
        "Éclairage" to R.color.cat_light,
        "Propreté" to R.color.cat_clean,
        "Espaces Verts" to R.color.cat_nature,
        "Autre" to R.color.cat_other
    )

    private var selectedBubbleCard: MaterialCardView? = null

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentReportCategoryBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }

        binding.btnNext.setOnClickListener {
            if (viewModel.category.value.isNotBlank()) {
                findNavController().navigate(R.id.action_reportCategoryFragment_to_reportLocationFragment)
            }
        }

        setupCategories()

        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.category.collectLatest { category ->
                binding.btnNext.isEnabled = category.isNotBlank()
            }
        }
    }

    private fun setupCategories() {
        val categories = resources.getStringArray(R.array.categories)
        val context = requireContext()

        val dp3 = (3 * resources.displayMetrics.density).toInt()
        val dp0 = 0

        for (category in categories) {
            val bubbleView = layoutInflater.inflate(R.layout.item_category_bubble, binding.layoutCategoriesContainer, false)

            val card = bubbleView.findViewById<MaterialCardView>(R.id.cardBubble)
            val icon = bubbleView.findViewById<ImageView>(R.id.ivCategoryIcon)
            val name = bubbleView.findViewById<TextView>(R.id.tvCategoryName)

            name.text = category
            icon.setImageResource(categoryIcons[category] ?: R.drawable.ic_more)
            card.setCardBackgroundColor(context.getColor(categoryColors[category] ?: R.color.cat_other))

            if (viewModel.category.value == category) {
                card.strokeWidth = dp3
                card.strokeColor = context.getColor(R.color.white)
                selectedBubbleCard = card
            }

            bubbleView.setOnClickListener {
                selectedBubbleCard?.strokeWidth = dp0
                card.strokeWidth = dp3
                card.strokeColor = context.getColor(R.color.white)
                selectedBubbleCard = card

                viewModel.setCategory(category)
            }

            binding.layoutCategoriesContainer.addView(bubbleView)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
