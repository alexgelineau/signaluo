package fr.univ.angers.ageline.signaluo

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import fr.univ.angers.ageline.signaluo.databinding.ItemReportBinding

class ReportAdapter(
    private val onItemClick: ((Report) -> Unit)? = null
) : ListAdapter<Report, ReportAdapter.ReportViewHolder>(ReportDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ReportViewHolder {
        val binding = ItemReportBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ReportViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ReportViewHolder, position: Int) {
        holder.bind(getItem(position), onItemClick)
    }

    class ReportViewHolder(private val binding: ItemReportBinding) : RecyclerView.ViewHolder(binding.root) {
        
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

        fun bind(report: Report, onItemClick: ((Report) -> Unit)?) {
            val context = binding.root.context
            binding.tvTitle.text = report.title
            binding.tvCategory.text = report.category
            binding.tvLocation.text = report.location
            binding.tvDate.text = report.date
            
            val iconRes = categoryIcons[report.category] ?: R.drawable.ic_more
            val catColorRes = categoryColors[report.category] ?: R.color.cat_other
            
            if (report.hasPhoto) {
                binding.ivReportThumbnail.setImageResource(android.R.drawable.ic_menu_gallery)
                binding.ivReportThumbnail.setColorFilter(context.getColor(R.color.status_sent))
                binding.ivReportThumbnail.setPadding(20, 20, 20, 20)
            } else {
                binding.ivReportThumbnail.setImageResource(iconRes)
                binding.ivReportThumbnail.setColorFilter(context.getColor(catColorRes))
                binding.ivReportThumbnail.setPadding(40, 40, 40, 40)
            }

            binding.root.setOnClickListener {
                onItemClick?.invoke(report)
            }
        }
    }

    class ReportDiffCallback : DiffUtil.ItemCallback<Report>() {
        override fun areItemsTheSame(oldItem: Report, newItem: Report): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Report, newItem: Report): Boolean {
            return oldItem == newItem
        }
    }
}
