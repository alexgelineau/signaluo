package fr.univ.angers.ageline.signaluo

import android.annotation.SuppressLint
import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import fr.univ.angers.ageline.signaluo.databinding.FragmentReportLocationBinding
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import org.osmdroid.config.Configuration
import org.osmdroid.events.MapEventsReceiver
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.overlay.MapEventsOverlay
import org.osmdroid.views.overlay.Marker
import java.util.Locale

class ReportLocationFragment : Fragment() {

    private var _binding: FragmentReportLocationBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ReportViewModel by activityViewModels()

    private var currentMarker: Marker? = null

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val ctx = requireContext().applicationContext
        Configuration.getInstance().load(ctx, ctx.getSharedPreferences("osmdroid", Context.MODE_PRIVATE))
        Configuration.getInstance().userAgentValue = ctx.packageName

        _binding = FragmentReportLocationBinding.inflate(inflater, container, false)
        return binding.root
    }

    @SuppressLint("ClickableViewAccessibility")
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }

        binding.etTitle.setText(viewModel.title.value)
        binding.etDescription.setText(viewModel.description.value)

        binding.etTitle.doAfterTextChanged {
            validateInputs()
        }

        binding.etDescription.doAfterTextChanged {
            validateInputs()
        }

        setupOsmMap()

        binding.mapView.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN, MotionEvent.ACTION_MOVE -> {
                    binding.scrollView.requestDisallowInterceptTouchEvent(true)
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    binding.scrollView.requestDisallowInterceptTouchEvent(false)
                }
            }
            false
        }

        binding.btnZoomIn.setOnClickListener {
            binding.mapView.controller.zoomIn()
        }

        binding.btnZoomOut.setOnClickListener {
            binding.mapView.controller.zoomOut()
        }

        binding.btnGpsLocation.setOnClickListener {
            selectGpsLocation()
        }

        binding.btnNext.setOnClickListener {
            val title = binding.etTitle.text.toString().trim()
            val description = binding.etDescription.text.toString().trim()
            if (title.isNotBlank() && description.isNotBlank() && viewModel.location.value.isNotBlank()) {
                viewModel.setDetails(title, description)
                findNavController().navigate(R.id.action_reportLocationFragment_to_reportDetailsFragment)
            }
        }

        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.location.collectLatest { loc ->
                if (loc.isNotBlank()) {
                    binding.tvLocationSelected.text = "✓ " + loc
                    binding.tvLocationSelected.visibility = View.VISIBLE
                } else {
                    binding.tvLocationSelected.visibility = View.GONE
                }
                validateInputs()
            }
        }
    }

    private fun setupOsmMap() {
        val map = binding.mapView
        map.setTileSource(TileSourceFactory.MAPNIK)
        map.setMultiTouchControls(true)
        map.setBuiltInZoomControls(false)

        val controller = map.controller
        controller.setZoom(15.0)

        val startPoint = GeoPoint(47.4712, -0.5513)
        controller.setCenter(startPoint)

        val mapEventsReceiver = object : MapEventsReceiver {
            override fun singleTapConfirmedHelper(p: GeoPoint): Boolean {
                placeMarker(p)
                return true
            }

            override fun longPressHelper(p: GeoPoint): Boolean {
                placeMarker(p)
                return true
            }
        }

        val eventsOverlay = MapEventsOverlay(mapEventsReceiver)
        map.overlays.add(eventsOverlay)
    }

    private fun placeMarker(geoPoint: GeoPoint) {
        val map = binding.mapView
        val pinDrawable = androidx.core.content.ContextCompat.getDrawable(requireContext(), R.drawable.ic_map_pin)

        if (currentMarker == null) {
            currentMarker = Marker(map).apply {
                title = "Position sélectionnée"
                icon = pinDrawable
                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
            }
            map.overlays.add(currentMarker)
        } else {
            currentMarker?.icon = pinDrawable
        }
        currentMarker?.position = geoPoint
        map.invalidate()

        val formattedLoc = String.format(Locale.FRANCE, "Carte: %.4f° N, %.4f° W", geoPoint.latitude, Math.abs(geoPoint.longitude))
        viewModel.setLocation(formattedLoc)
        Toast.makeText(requireContext(), getString(R.string.toast_map_pin_placed), Toast.LENGTH_SHORT).show()
    }

    private fun selectGpsLocation() {
        binding.btnGpsLocation.isEnabled = false
        binding.btnGpsLocation.text = getString(R.string.loading_gps)

        view?.postDelayed({
            val gpsPoint = GeoPoint(47.4712, -0.5513)
            binding.mapView.controller.animateTo(gpsPoint)
            binding.mapView.controller.setZoom(16.0)

            placeMarker(gpsPoint)

            val loc = getString(R.string.location_gps_selected)
            viewModel.setLocation(loc)

            binding.btnGpsLocation.isEnabled = true
            binding.btnGpsLocation.text = getString(R.string.location_option_gps)
            Toast.makeText(requireContext(), getString(R.string.toast_location_retrieved), Toast.LENGTH_SHORT).show()
        }, 600)
    }

    private fun validateInputs() {
        val title = binding.etTitle.text.toString().trim()
        val description = binding.etDescription.text.toString().trim()
        val hasLocation = viewModel.location.value.isNotBlank()

        binding.btnNext.isEnabled = title.isNotBlank() && description.isNotBlank() && hasLocation
    }

    override fun onResume() {
        super.onResume()
        binding.mapView.onResume()
    }

    override fun onPause() {
        super.onPause()
        binding.mapView.onPause()
    }

    override fun onDestroyView() {
        binding.mapView.onDetach()
        super.onDestroyView()
        _binding = null
    }
}
