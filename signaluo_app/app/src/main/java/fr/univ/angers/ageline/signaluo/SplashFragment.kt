package fr.univ.angers.ageline.signaluo

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import fr.univ.angers.ageline.signaluo.databinding.FragmentSplashBinding

class SplashFragment : Fragment() {

    private var _binding: FragmentSplashBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSplashBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        view.postDelayed({
            if (isAdded) {
                findNavController().navigate(R.id.action_splashFragment_to_reportPhotoFragment)
            }
        }, 2000)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
